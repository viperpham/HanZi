using System.Text;
using Mapster;
using HanZi.Server.Application.Features.Auth;
using HanZi.Server.Application.Features.Assignments;
using HanZi.Server.Application.Features.Classes;
using HanZi.Server.Application.Features.Curriculums;
using HanZi.Server.Application.Features.Dashboard;
using HanZi.Server.Application.Features.Grading;
using HanZi.Server.Application.Features.Lessons;
using HanZi.Server.Application.Features.Notifications;
using HanZi.Server.Application.Features.Progress;
using HanZi.Server.Application.Features.Users;
using HanZi.Server.Domain.Common;
using HanZi.Server;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Hubs;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Data;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Infrastructure.Push;
using HanZi.Server.Infrastructure.Repositories;
using Lib.Net.Http.WebPush;
using HanZi.Server.Infrastructure.Tts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();
Log.Information("Khởi động HanZi.Server…");

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Tạo trước wwwroot/audio — nếu không, WebRootPath không được nhận diện và UseStaticFiles vô dụng
    Directory.CreateDirectory(Path.Combine(
        builder.Environment.WebRootPath ?? Path.Combine(builder.Environment.ContentRootPath, "wwwroot"), "audio"));

    // Serilog
    builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).WriteTo.Console());

    // DbContext + interceptor (audit + soft delete)
    builder.Services.AddScoped<AuditSaveChangesInterceptor>();
    builder.Services.AddDbContext<AppDbContext>((sp, opts) =>
        opts.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
            .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>()));

    // Options
    var jwt = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
              ?? throw new InvalidOperationException("Thiếu cấu hình Jwt");
    if (string.IsNullOrWhiteSpace(jwt.Secret))
        throw new InvalidOperationException(
            "Thiếu Jwt:Secret — đặt biến môi trường Jwt__Secret (file .env khi chạy Docker).");
    builder.Services.AddSingleton(jwt);

    // Auth — JWT tự viết
    builder.Services.AddScoped<ITokenService, JwtTokenService>();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUser, CurrentUser>();

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o =>
        {
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwt.Issuer,
                ValidAudience = jwt.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                ClockSkew = TimeSpan.FromSeconds(10)
            };
            // SignalR WebSocket gửi token qua query string
            o.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hub"))
                        context.Token = accessToken;
                    return Task.CompletedTask;
                }
            };
        });
    builder.Services.AddAuthorization();

    // SignalR — realtime notification
    builder.Services.AddSignalR();

    // Generic repository + Unit of Work
    builder.Services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
    builder.Services.AddScoped<PushDispatcher>();
    builder.Services.AddScoped<IUnitOfWork>(sp => new UnitOfWork(
        sp.GetRequiredService<AppDbContext>(),
        sp.GetRequiredService<PushDispatcher>()));

    // Web Push (VAPID)
    builder.Services.Configure<PushOptions>(builder.Configuration.GetSection(PushOptions.SectionName));
    builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<PushOptions>>().Value);
    builder.Services.AddSingleton<VapidKeyProvider>();
    builder.Services.AddSingleton<PushServiceClient>();

    // Application services
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<ICurriculumService, CurriculumService>();
    builder.Services.AddScoped<ILessonService, LessonService>();
    builder.Services.AddScoped<IClassService, ClassService>();
    builder.Services.AddScoped<IAssignmentService, AssignmentService>();
    builder.Services.AddScoped<ISubmissionService, SubmissionService>();
    builder.Services.AddScoped<IGradingService, GradingService>();
    builder.Services.AddScoped<IProgressService, ProgressService>();
    builder.Services.AddScoped<INotificationService, NotificationService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IDashboardService, DashboardService>();

    // Sinh file âm thanh TTS (mp3) khi lưu bài học
    builder.Services.AddHttpClient("tts", c =>
        c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"));
    builder.Services.AddScoped<IAudioService, AudioService>();

    // Mapster: quét mapping profile
    builder.Services.RegisterMapsterConfiguration();

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    // CORS cho Angular (dev chạy 4200)
    builder.Services.AddCors(o => o.AddPolicy("client", p => p
        .WithOrigins("http://localhost:4200", "https://hanzio.live", "http://localhost:8100")
        .AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    // Tự áp dụng migrations khi khởi động (Docker/PC Ubuntu không cần chạy tay)
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (!EF.IsDesignTime) db.Database.Migrate();
    }

    // Seed admin đầu tiên nếu DB trống (bỏ qua khi chạy tool EF design-time)
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (!EF.IsDesignTime && !await db.Users.AnyAsync())
        {
            var adminEmail = builder.Configuration["Admin:Email"] ?? "admin@hanzi.vn";
            var adminPassword = builder.Configuration["Admin:Password"] ?? "123456";
            db.Users.Add(new User
            {
                FullName = "Nguyễn Quản Trị",
                Email = adminEmail,
                PasswordHash = PasswordHasher.Hash(adminPassword),
                Role = UserRole.Admin
            });
            await db.SaveChangesAsync();
            if (adminPassword == "123456")
                Log.Warning("Admin {Email} seeded với mật khẩu mặc định 123456 — HÃY ĐỔI NGAY trong app!", adminEmail);
            else
                Log.Information("Đã seed tài khoản admin mặc định ({Email})", adminEmail);
        }
    }

    // Phục vụ file âm thanh TTS (wwwroot/audio/*.mp3)
    app.UseStaticFiles();

    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseSerilogRequestLogging();
    app.UseCors("client");
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<HanZi.Server.Hubs.NotificationHub>("/hub/notifications");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "HanZi.Server dừng bất thường");
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>Mapster: điểm đăng ký mapping (DTO ⇄ Entity) — các feature thêm profile vào đây.</summary>
public static class MapsterConfig
{
    public static IServiceCollection RegisterMapsterConfiguration(this IServiceCollection services)
    {
        // Mapster quét IRegister trong assembly (feature sẽ thêm profile sau)
        TypeAdapterConfig.GlobalSettings.Scan(typeof(MapsterConfig).Assembly);
        return services;
    }
}

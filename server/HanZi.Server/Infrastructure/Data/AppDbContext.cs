using System.Linq.Expressions;
using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, AuditSaveChangesInterceptor auditInterceptor)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Curriculum> Curriculums => Set<Curriculum>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Vocabulary> Vocabularies => Set<Vocabulary>();
    public DbSet<GrammarPoint> GrammarPoints => Set<GrammarPoint>();
    public DbSet<GrammarExample> GrammarExamples => Set<GrammarExample>();
    public DbSet<CommonMistake> CommonMistakes => Set<CommonMistake>();
    public DbSet<Drill> Drills => Set<Drill>();
    public DbSet<DrillOption> DrillOptions => Set<DrillOption>();
    public DbSet<DialogueLine> DialogueLines => Set<DialogueLine>();
    public DbSet<SentencePuzzle> SentencePuzzles => Set<SentencePuzzle>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionAnswer> SubmissionAnswers => Set<SubmissionAnswer>();
    public DbSet<GradingNote> GradingNotes => Set<GradingNote>();
    public DbSet<Progress> Progresses => Set<Progress>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Attendance> Attendances => Set<Attendance>();

    protected override void OnConfiguring(DbContextOptionsBuilder builder)
        => builder.AddInterceptors(auditInterceptor);

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Mọi enum lưu dạng string trong PostgreSQL — đọc/ lọc/ debug dễ
        builder.Properties<Enum>().HaveConversion<string>();
        // Điểm số: numeric(5,2)
        builder.Properties<decimal>().HavePrecision(5, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global Query Filter: tự áp "is_deleted = false" cho MỌI entity có ISoftDelete.
        // Viết 1 lần — không bảng nào quên được.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(ISoftDelete).IsAssignableFrom(entityType.ClrType)) continue;

            var param = Expression.Parameter(entityType.ClrType, "e");
            var body = Expression.Equal(
                Expression.Property(param, nameof(ISoftDelete.IsDeleted)),
                Expression.Constant(false));
            entityType.SetQueryFilter(Expression.Lambda(body, param));
        }
    }
}

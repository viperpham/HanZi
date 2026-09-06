using System.Buffers.Text;
using System.Security.Cryptography;
using Lib.Net.Http.WebPush;

namespace HanZi.Server.Infrastructure.Push;

public class PushOptions
{
    public const string SectionName = "Push";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
    public string Subject { get; set; } = "https://hanzio.live";
}

/// <summary>
/// Cung cấp cặp khoá VAPID: ưu tiên cấu hình (env Push__PublicKey / Push__PrivateKey);
/// nếu không có thì tự sinh và lưu vào App_Data/vapid-keys.json để giữ nguyên qua các lần restart.
/// Khoá chuẩn Web Push: P-256, public = 65 byte (04||X||Y), private = 32 byte (D) — base64url.
/// </summary>
public class VapidKeyProvider(PushOptions options, IHostEnvironment env, ILogger<VapidKeyProvider> logger)
{
    private (string PublicKey, string PrivateKey)? _cached;
    private static readonly object _lock = new();

    public (string PublicKey, string PrivateKey) Get()
    {
        if (_cached is { } c) return c;

        lock (_lock)
        {
            if (_cached is { } c2) return c2;

            if (!string.IsNullOrWhiteSpace(options.PublicKey) && !string.IsNullOrWhiteSpace(options.PrivateKey))
            {
                logger.LogInformation("Web Push: dùng khoá VAPID từ cấu hình");
                _cached = (options.PublicKey, options.PrivateKey);
                return _cached.Value;
            }

            var file = Path.Combine(env.ContentRootPath, "App_Data", "vapid-keys.json");
            if (File.Exists(file))
            {
                try
                {
                    var saved = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(file));
                    if (saved is not null && saved.TryGetValue("publicKey", out var pk) && saved.TryGetValue("privateKey", out var sk)
                        && !string.IsNullOrWhiteSpace(pk) && !string.IsNullOrWhiteSpace(sk))
                    {
                        logger.LogInformation("Web Push: dùng khoá VAPID đã lưu trong App_Data");
                        _cached = (pk, sk);
                        return _cached.Value;
                    }
                }
                catch (Exception ex) { logger.LogWarning(ex, "Đọc vapid-keys.json lỗi — sẽ sinh khoá mới"); }
            }

            var generated = GenerateKeyPair();
            Directory.CreateDirectory(Path.GetDirectoryName(file)!);
            File.WriteAllText(file, System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["publicKey"] = generated.PublicKey,
                ["privateKey"] = generated.PrivateKey
            }, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
            logger.LogWarning(
                "Web Push: chưa cấu hình VAPID — đã tự sinh và lưu vào {File}. Public key (cho client): {PublicKey}",
                file, generated.PublicKey);
            _cached = (generated.PublicKey, generated.PrivateKey);
            return _cached.Value;
        }
    }

    private static (string PublicKey, string PrivateKey) GenerateKeyPair()
    {
        using var ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var p = ec.ExportParameters(true);
        var publicKey = Base64Url.EncodeToString(
            new byte[] { 4 }.Concat(Pad(p.Q.X)).Concat(Pad(p.Q.Y)).ToArray());
        var privateKey = Base64Url.EncodeToString(Pad(p.D));
        return (publicKey, privateKey);
    }

    private static byte[] Pad(byte[]? value)
    {
        var buf = new byte[32];
        (value ?? []).AsSpan().CopyTo(buf.AsSpan(buf.Length - (value?.Length ?? 0)));
        return buf;
    }
}

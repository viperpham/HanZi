using System.Security.Cryptography;
using System.Text;

namespace HanZi.Server.Infrastructure.Tts;

public interface IAudioService
{
    /// <summary>
    /// Sinh file .mp3 cho văn bản tiếng Trung — lưu tại wwwroot/audio, cache theo hash nội dung
    /// (cùng 1 từ/câu chỉ sinh 1 lần). Trả về URL tương đối "/audio/{hash}.mp3", lỗi thì null.
    /// </summary>
    Task<string?> GenerateAsync(string text, CancellationToken ct = default);
}

public class AudioService(IHttpClientFactory factory, IWebHostEnvironment env, ILogger<AudioService> logger) : IAudioService
{
    private static readonly SemaphoreSlim Gate = new(3); // giới hạn gọi đồng thời

    public async Task<string?> GenerateAsync(string text, CancellationToken ct = default)
    {
        var clean = new string(text.Where(c => c >= 0x2E80).ToArray()).Trim();
        if (clean.Length == 0) return null;

        var root = WebRootAudioDir();
        Directory.CreateDirectory(root);

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(clean))).ToLowerInvariant()[..32];
        var file = Path.Combine(root, hash + ".mp3");
        var url = "/audio/" + hash + ".mp3";
        if (File.Exists(file)) return url;

        try
        {
            await Gate.WaitAsync(ct);
            var q = Uri.EscapeDataString(clean[..Math.Min(clean.Length, 200)]);
            var bytes = await factory.CreateClient("tts")
                .GetByteArrayAsync($"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&ttsspeed=1&tl=zh-CN&q={q}", ct);
            if (bytes.Length < 100) return null; // phản hồi rác/lỗi

            await File.WriteAllBytesAsync(file, bytes, ct);
            return url;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Sinh âm thanh thất bại cho: {Text}", clean[..Math.Min(clean.Length, 30)]);
            return null;
        }
        finally
        {
            Gate.Release();
        }
    }

    private string WebRootAudioDir()
        => Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "audio");
}

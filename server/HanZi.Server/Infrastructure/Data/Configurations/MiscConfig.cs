using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class ProgressConfig : IEntityTypeConfiguration<Progress>
{
    public void Configure(EntityTypeBuilder<Progress> b)
    {
        b.ToTable("progress");

        b.HasOne(x => x.Student)
         .WithMany()
         .HasForeignKey(x => x.StudentId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Lesson)
         .WithMany()
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.StudentId, x.LessonId }).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}

public class NotificationConfig : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.Property(x => x.Body).HasMaxLength(500).IsRequired();

        b.HasOne(x => x.User)
         .WithMany()
         .HasForeignKey(x => x.UserId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.UserId, x.ReadAt });
    }
}

public class PushSubscriptionConfig : IEntityTypeConfiguration<PushSubscription>
{
    public void Configure(EntityTypeBuilder<PushSubscription> b)
    {
        b.ToTable("push_subscriptions");
        b.Property(x => x.Endpoint).HasMaxLength(500).IsRequired();
        b.Property(x => x.P256dh).HasMaxLength(200).IsRequired();
        b.Property(x => x.Auth).HasMaxLength(200).IsRequired();

        b.HasOne(x => x.User)
         .WithMany()
         .HasForeignKey(x => x.UserId)
         .OnDelete(DeleteBehavior.Cascade);

        // 1 endpoint chỉ thuộc 1 user — chặn đăng ký trùng/tráo
        b.HasIndex(x => x.Endpoint).IsUnique().HasFilter("\"IsDeleted\" = false");
        b.HasIndex(x => x.UserId);
    }
}

public class ActivityLogConfig : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> b)
    {
        b.ToTable("activity_logs");
        b.Property(x => x.Action).HasMaxLength(500).IsRequired();
        b.HasIndex(x => x.CreatedAt);
    }
}

public class AttendanceConfig : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> b)
    {
        b.ToTable("attendances");

        b.HasOne(x => x.Class)
         .WithMany()
         .HasForeignKey(x => x.ClassId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Student)
         .WithMany()
         .HasForeignKey(x => x.StudentId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.ClassId, x.StudentId, x.Date }).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}

public class SentencePuzzleConfig : IEntityTypeConfiguration<SentencePuzzle>
{
    public void Configure(EntityTypeBuilder<SentencePuzzle> b)
    {
        b.ToTable("sentence_puzzles");
        b.Property(x => x.Sentence).HasMaxLength(300).IsRequired();
        b.Property(x => x.MeaningVi).HasMaxLength(300).IsRequired();

        b.HasOne(x => x.Lesson)
         .WithMany()
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.LessonId, x.OrderNo });
    }
}

using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class SubmissionConfig : IEntityTypeConfiguration<Submission>
{
    public void Configure(EntityTypeBuilder<Submission> b)
    {
        b.ToTable("submissions");

        b.HasOne(x => x.Student)
         .WithMany()
         .HasForeignKey(x => x.StudentId)
         .OnDelete(DeleteBehavior.Cascade);

        // 1 bài nộp / 1 học viên / 1 bài tập
        b.HasIndex(x => new { x.AssignmentId, x.StudentId }).IsUnique().HasFilter("\"IsDeleted\" = false");
        b.HasIndex(x => x.StudentId);

        b.HasMany(x => x.Answers)
         .WithOne(a => a.Submission)
         .HasForeignKey(a => a.SubmissionId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.GradingNote)
         .WithOne(n => n.Submission)
         .HasForeignKey<GradingNote>(n => n.SubmissionId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SubmissionAnswerConfig : IEntityTypeConfiguration<SubmissionAnswer>
{
    public void Configure(EntityTypeBuilder<SubmissionAnswer> b)
    {
        b.ToTable("submission_answers");
        b.Property(x => x.AnswerText).HasMaxLength(2000);
        b.Property(x => x.TeacherComment).HasMaxLength(1000);

        b.HasOne(x => x.Question)
         .WithMany()
         .HasForeignKey(x => x.QuestionId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.SubmissionId, x.QuestionId }).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}

public class GradingNoteConfig : IEntityTypeConfiguration<GradingNote>
{
    public void Configure(EntityTypeBuilder<GradingNote> b)
    {
        b.ToTable("grading_notes");
        b.HasIndex(x => x.SubmissionId).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}

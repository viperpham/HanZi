using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class AssignmentConfig : IEntityTypeConfiguration<Assignment>
{
    public void Configure(EntityTypeBuilder<Assignment> b)
    {
        b.ToTable("assignments");
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();

        b.HasOne(x => x.Class)
         .WithMany(c => c.Assignments)
         .HasForeignKey(x => x.ClassId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Lesson)
         .WithMany()
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Questions)
         .WithOne(q => q.Assignment)
         .HasForeignKey(q => q.AssignmentId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Submissions)
         .WithOne(s => s.Assignment)
         .HasForeignKey(s => s.AssignmentId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => x.ClassId);
        b.HasIndex(x => x.DueAt);
    }
}

public class QuestionConfig : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> b)
    {
        b.ToTable("assignment_questions");
        b.Property(x => x.Prompt).HasMaxLength(1000).IsRequired();
        b.Property(x => x.Answer).HasMaxLength(500);
        b.Property(x => x.SampleAnswer).HasMaxLength(1000);

        b.HasIndex(x => new { x.AssignmentId, x.OrderNo });

        b.HasMany(x => x.Options)
         .WithOne(o => o.Question)
         .HasForeignKey(o => o.QuestionId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class QuestionOptionConfig : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> b)
    {
        b.ToTable("question_options");
        b.Property(x => x.Text).HasMaxLength(500).IsRequired();
        b.HasIndex(x => new { x.QuestionId, x.OrderNo });
    }
}

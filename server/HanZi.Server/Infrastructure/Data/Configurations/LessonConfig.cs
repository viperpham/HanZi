using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class LessonConfig : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> b)
    {
        b.ToTable("lessons");
        b.Property(x => x.TitleVi).HasMaxLength(200).IsRequired();
        b.Property(x => x.TitleZh).HasMaxLength(200).IsRequired();

        b.HasIndex(x => new { x.CurriculumId, x.OrderNo }).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}

public class VocabularyConfig : IEntityTypeConfiguration<Vocabulary>
{
    public void Configure(EntityTypeBuilder<Vocabulary> b)
    {
        b.ToTable("vocabulary");
        b.Property(x => x.Hanzi).HasMaxLength(50).IsRequired();
        b.Property(x => x.Pinyin).HasMaxLength(200).IsRequired();
        b.Property(x => x.MeaningVi).HasMaxLength(300).IsRequired();

        b.HasOne(x => x.Lesson)
         .WithMany(l => l.Vocabularies)
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.LessonId, x.OrderNo }).IsUnique().HasFilter("\"IsDeleted\" = false");
        b.HasIndex(x => x.Hanzi);
    }
}

public class DialogueLineConfig : IEntityTypeConfiguration<DialogueLine>
{
    public void Configure(EntityTypeBuilder<DialogueLine> b)
    {
        b.ToTable("dialogue_lines");
        b.Property(x => x.Zh).HasMaxLength(500).IsRequired();
        b.Property(x => x.Vi).HasMaxLength(500).IsRequired();

        b.HasOne(x => x.Lesson)
         .WithMany(l => l.DialogueLines)
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.LessonId, x.OrderNo });
    }
}

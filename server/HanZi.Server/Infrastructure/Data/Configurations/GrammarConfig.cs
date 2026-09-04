using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class GrammarPointConfig : IEntityTypeConfiguration<GrammarPoint>
{
    public void Configure(EntityTypeBuilder<GrammarPoint> b)
    {
        b.ToTable("grammar_points");
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();

        b.HasOne(x => x.Lesson)
         .WithMany(l => l.GrammarPoints)
         .HasForeignKey(x => x.LessonId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.LessonId, x.OrderNo });

        b.HasMany(x => x.Examples)
         .WithOne(e => e.GrammarPoint)
         .HasForeignKey(e => e.GrammarPointId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Mistakes)
         .WithOne(m => m.GrammarPoint)
         .HasForeignKey(m => m.GrammarPointId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Drills)
         .WithOne(d => d.GrammarPoint)
         .HasForeignKey(d => d.GrammarPointId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class GrammarExampleConfig : IEntityTypeConfiguration<GrammarExample>
{
    public void Configure(EntityTypeBuilder<GrammarExample> b)
    {
        b.ToTable("grammar_examples");
        b.Property(x => x.Zh).HasMaxLength(300).IsRequired();
        b.Property(x => x.Vi).HasMaxLength(300).IsRequired();
        b.HasIndex(x => new { x.GrammarPointId, x.OrderNo });
    }
}

public class CommonMistakeConfig : IEntityTypeConfiguration<CommonMistake>
{
    public void Configure(EntityTypeBuilder<CommonMistake> b)
    {
        b.ToTable("common_mistakes");
        b.Property(x => x.WrongText).HasMaxLength(300).IsRequired();
        b.Property(x => x.RightText).HasMaxLength(300).IsRequired();
        b.HasIndex(x => x.GrammarPointId);
    }
}

public class DrillConfig : IEntityTypeConfiguration<Drill>
{
    public void Configure(EntityTypeBuilder<Drill> b)
    {
        b.ToTable("drills");
        b.Property(x => x.Question).HasMaxLength(500).IsRequired();

        b.HasIndex(x => new { x.GrammarPointId, x.OrderNo });

        b.HasMany(x => x.Options)
         .WithOne(o => o.Drill)
         .HasForeignKey(o => o.DrillId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DrillOptionConfig : IEntityTypeConfiguration<DrillOption>
{
    public void Configure(EntityTypeBuilder<DrillOption> b)
    {
        b.ToTable("drill_options");
        b.Property(x => x.Text).HasMaxLength(300).IsRequired();
        b.HasIndex(x => new { x.DrillId, x.OrderNo });
    }
}

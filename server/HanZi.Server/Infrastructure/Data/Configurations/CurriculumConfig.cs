using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("users");
        b.Property(x => x.FullName).HasMaxLength(120).IsRequired();
        b.Property(x => x.Email).HasMaxLength(200).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(200).IsRequired();

        // unique chỉ tính bản ghi còn hoạt động — cho phép email tái sử dụng sau khi xoá mềm
        b.HasIndex(x => x.Email).IsUnique().HasFilter("\"IsDeleted\" = false");
        b.HasIndex(x => x.Role);
    }
}

public class CurriculumConfig : IEntityTypeConfiguration<Curriculum>
{
    public void Configure(EntityTypeBuilder<Curriculum> b)
    {
        b.ToTable("curriculums");
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.NameVi).HasMaxLength(200).IsRequired();
        b.Property(x => x.NameZh).HasMaxLength(200).IsRequired();
        b.Property(x => x.Level).HasMaxLength(10).IsRequired();
        b.Property(x => x.CoverColor).HasMaxLength(20);

        b.HasIndex(x => x.Code).IsUnique().HasFilter("\"IsDeleted\" = false");

        b.HasOne(x => x.Teacher)
         .WithMany()
         .HasForeignKey(x => x.TeacherId)
         .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.Lessons)
         .WithOne(l => l.Curriculum)
         .HasForeignKey(l => l.CurriculumId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

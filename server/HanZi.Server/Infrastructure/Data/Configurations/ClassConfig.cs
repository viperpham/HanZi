using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HanZi.Server.Infrastructure.Data.Configurations;

public class ClassRoomConfig : IEntityTypeConfiguration<ClassRoom>
{
    public void Configure(EntityTypeBuilder<ClassRoom> b)
    {
        b.ToTable("classes");
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();

        b.HasIndex(x => x.Code).IsUnique().HasFilter("\"IsDeleted\" = false");

        b.HasOne(x => x.Curriculum)
         .WithMany()
         .HasForeignKey(x => x.CurriculumId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Teacher)
         .WithMany()
         .HasForeignKey(x => x.TeacherId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Enrollments)
         .WithOne(e => e.Class)
         .HasForeignKey(e => e.ClassId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class EnrollmentConfig : IEntityTypeConfiguration<Enrollment>
{
    public void Configure(EntityTypeBuilder<Enrollment> b)
    {
        b.ToTable("class_students");

        b.HasOne(x => x.Student)
         .WithMany(u => u.Enrollments)
         .HasForeignKey(x => x.StudentId)
         .OnDelete(DeleteBehavior.Cascade);

        // 1 học viên 1 lớp 1 dòng (còn hoạt động)
        b.HasIndex(x => new { x.ClassId, x.StudentId }).IsUnique().HasFilter("\"IsDeleted\" = false");
        b.HasIndex(x => x.StudentId);
    }
}

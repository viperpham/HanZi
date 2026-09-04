using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HanZi.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentExcludedStudents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExcludedStudentIds",
                table: "assignments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExcludedStudentIds",
                table: "assignments");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HanZi.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddFileAssets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "file_assets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StoredName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    UploaderId = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_assets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_file_assets_users_UploaderId",
                        column: x => x.UploaderId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_file_assets_Kind",
                table: "file_assets",
                column: "Kind");

            migrationBuilder.CreateIndex(
                name: "IX_file_assets_LessonId",
                table: "file_assets",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_file_assets_SubmissionId",
                table: "file_assets",
                column: "SubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_file_assets_UploaderId",
                table: "file_assets",
                column: "UploaderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "file_assets");
        }
    }
}

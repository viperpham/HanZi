using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HanZi.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSentencePuzzleAndKnowledgeTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KnowledgeTag",
                table: "assignment_questions",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sentence_puzzles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNo = table.Column<int>(type: "integer", nullable: false),
                    Sentence = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Pinyin = table.Column<string>(type: "text", nullable: true),
                    MeaningVi = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
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
                    table.PrimaryKey("PK_sentence_puzzles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sentence_puzzles_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sentence_puzzles_LessonId_OrderNo",
                table: "sentence_puzzles",
                columns: new[] { "LessonId", "OrderNo" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sentence_puzzles");

            migrationBuilder.DropColumn(
                name: "KnowledgeTag",
                table: "assignment_questions");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HanZi.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddUsername : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            // Backfill: user cũ lấy username từ phần trước @ của email.
            // Email rỗng/không hợp lệ → fallback theo id; cắt còn 50 ký tự cho vừa cột varchar(50);
            // cuối cùng gắn hậu tố id cho các username trùng để đảm bảo duy nhất (index bên dưới).
            migrationBuilder.Sql(@"
                UPDATE users SET ""Username"" = lower(split_part(""Email"", '@', 1))
                WHERE ""Email"" LIKE '%_@_%' AND split_part(""Email"", '@', 1) <> '';

                UPDATE users
                SET ""Username"" = 'user_' || substr(replace(""Id""::text, '-', ''), 1, 8)
                WHERE ""Username"" = '';

                UPDATE users SET ""Username"" = left(""Username"", 50);

                UPDATE users u
                SET ""Username"" = left(u.""Username"", 45) || '_' || substr(replace(u.""Id""::text, '-', ''), 1, 4)
                FROM (
                    SELECT ""Id"", row_number() OVER (
                        PARTITION BY ""Username""
                        ORDER BY ""CreatedAt"") AS rn
                    FROM users
                ) d
                WHERE u.""Id"" = d.""Id"" AND d.rn > 1;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_users_Username",
                table: "users",
                column: "Username",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_Username",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "users");
        }
    }
}

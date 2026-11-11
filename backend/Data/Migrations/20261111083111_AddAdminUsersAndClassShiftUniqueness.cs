using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmissionSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminUsersAndClassShiftUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_classes_name",
                table: "classes");

            migrationBuilder.CreateTable(
                name: "admin_users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    full_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_login_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_users", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_classes_name_shift",
                table: "classes",
                columns: new[] { "name", "shift" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_classes_total_seats_range",
                table: "classes",
                sql: "total_seats >= 1 AND total_seats <= 10000");

            // Additional case-insensitive guard for duplicate class/shift combinations.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_classes_name_shift_lower ON classes (lower(name), lower(shift));");

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_email",
                table: "admin_users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_users");

            migrationBuilder.DropIndex(
                name: "IX_classes_name_shift",
                table: "classes");

            migrationBuilder.DropCheckConstraint(
                name: "ck_classes_total_seats_range",
                table: "classes");

            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_classes_name_shift_lower;");

            migrationBuilder.CreateIndex(
                name: "IX_classes_name",
                table: "classes",
                column: "name",
                unique: true);
        }
    }
}

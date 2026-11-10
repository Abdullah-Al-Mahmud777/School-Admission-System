using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmissionSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationCancellation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                table: "seat_holds",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "application_cancellations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    hold_id = table.Column<Guid>(type: "uuid", nullable: false),
                    class_id = table.Column<Guid>(type: "uuid", nullable: false),
                    student_id = table.Column<string>(type: "text", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    previous_hold_status = table.Column<int>(type: "integer", nullable: false),
                    previous_payment_status = table.Column<int>(type: "integer", nullable: false),
                    previous_admission_status = table.Column<int>(type: "integer", nullable: false),
                    new_hold_status = table.Column<int>(type: "integer", nullable: false),
                    new_payment_status = table.Column<int>(type: "integer", nullable: false),
                    new_admission_status = table.Column<int>(type: "integer", nullable: false),
                    cancelled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_cancellations", x => x.id);
                    table.ForeignKey(
                        name: "FK_application_cancellations_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_application_cancellations_seat_holds_hold_id",
                        column: x => x.hold_id,
                        principalTable: "seat_holds",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_application_cancellations_cancelled_at",
                table: "application_cancellations",
                column: "cancelled_at");

            migrationBuilder.CreateIndex(
                name: "IX_application_cancellations_class_id",
                table: "application_cancellations",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_cancellations_hold_id",
                table: "application_cancellations",
                column: "hold_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_application_cancellations_student_id",
                table: "application_cancellations",
                column: "student_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "application_cancellations");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "seat_holds");
        }
    }
}

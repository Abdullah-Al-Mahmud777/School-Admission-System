using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmissionSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentAndAdmissionStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "admission_status",
                table: "seat_holds",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "paid_at",
                table: "seat_holds",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_status",
                table: "seat_holds",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "admission_status",
                table: "seat_holds");

            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "seat_holds");

            migrationBuilder.DropColumn(
                name: "payment_status",
                table: "seat_holds");
        }
    }
}

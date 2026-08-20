export class ReportingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingError";
  }
}

export class InvalidGstReportPeriodError extends ReportingError {
  constructor(period: string) {
    super(`Invalid GST report period "${period}". Expected YYYY-MM.`);
    this.name = "InvalidGstReportPeriodError";
  }
}

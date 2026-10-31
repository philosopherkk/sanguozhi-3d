/** 年表事件的可選月／日粒度（舊資料缺省＝僅年）。 */

export type DatePrecision = 'year' | 'month' | 'day'

export type CalendarNote = 'gregorian' | 'lunar' | 'jp-nengo' | 'mixed'

export interface TimelineDateFields {
  month?: number
  day?: number
  /** 缺省視為 year */
  datePrecision?: DatePrecision
  calendarNote?: CalendarNote
  disputedDate?: boolean
}

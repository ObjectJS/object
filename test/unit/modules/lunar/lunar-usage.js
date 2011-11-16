module('lunar-usage');

object.use('lunar', function(exports, lunar) {
	window.lunar = lunar;
});

test("lunar.convertSolarToLunar", function(){
	var converted = lunar.convertSolarToLunar(1985, 9, 9);
	equal(converted[0], 1985, 'year is right');
	equal(converted[1], '七月', 'month is right');
	equal(converted[2], '廿五', 'date is right');
}); 				
test("lunar.convertLunarToSolar", function(){
	var converted = lunar.convertLunarToSolar(1985, 7, 25);
	equal(converted[0], 1985, 'year is right');
	equal(converted[1], 9, 'month is right');
	equal(converted[2], 9, 'date is right');
});
test("lunar.isLeapYear", function(){
	equal(lunar.isLeapYear(2000), true, '2000 is leap year');
	equal(lunar.isLeapYear(1996), true, '1996 is leap year');
	equal(lunar.isLeapYear(2001), false, '2001 is not leap year');
}); 
test("lunar.getLunarYearName", function() {
	equal(lunar.getLunarYearName('2011'), '辛卯', '2011 Lunar Year name is 辛卯');
});
test("lunar.getYearZodiac", function() {
	equal(lunar.getYearZodiac('1985'), '牛', '1985 is 牛');
	equal(lunar.getYearZodiac('1997'), '牛', '1997 is 牛');
	equal(lunar.getYearZodiac('2009'), '牛', '2009 is 牛');
});
test("lunar.getSolarMonthDays", function() {
	equal(lunar.getSolarMonthDays(2011, 11), 30, '2011.11 has 30 days');
	equal(lunar.getSolarMonthDays(2011, 10), 31, '2011.10 has 31 days');
	equal(lunar.getSolarMonthDays(2000, 2), 29, '2000.2 has 29 days');
	equal(lunar.getSolarMonthDays(2011, 2), 28, '2011.2 has 28 days');
});
test("lunar.getLunarMonthDays", function() {
	equal(lunar.getLunarMonthDays(2011, 11), 30, '2011.11 has 30 days in lunar month');
});
test("lunar.getLunarMonths", function() {
	var months = lunar.getLunarMonths(2011);
	equal(months.length, 12, '12 months');
	equal(months[10], 30, '2011.11 has 30 days in lunar month');
	var months = lunar.getLunarMonths(2009);
	equal(months.length, 13, '13 lunar months in 2009');
});
test("lunar.getLunarMonthsLength", function() {
	equal(lunar.getLunarMonthsLength(2011), 12, '12 lunar months in 2011');
	equal(lunar.getLunarMonthsLength(2010), 12, '12 lunar months in 2010');
	equal(lunar.getLunarMonthsLength(2009), 13, '13 lunar months in 2009');
});
test("lunar.getLunarMonthNames", function() {
	equal(lunar.getLunarMonthNames(2011)[0], '正月', 'ok');
	equal(lunar.getLunarMonthNames(2010)[0], '正月', 'ok');
	equal(lunar.getLunarMonthNames(2009)[5], '闰五月', 'ok');	
});
test("lunar.getLunarDates", function() {
	equal(lunar.getLunarDates(2011, 1).length, 30, '30 days with lunar names');
	equal(lunar.getLunarDates(2010, 1).length, 30, '30 days with lunar names');
	equal(lunar.getLunarDates(2009, 5).length, 30, '30 days with lunar names');
});
test("lunar.getMaxLunarDates", function() {
	equal(lunar.getMaxLunarDates().length, 30, '30 days with lunar names');
});
test("lunar.getLunarYearDays", function() {
	equal(lunar.getLunarYearDays(2011), 354, '2011 lunar days count is 354');
	equal(lunar.getLunarYearDays(2010), 354, '2010 lunar days count is 354');
	equal(lunar.getLunarYearDays(2009), 384, '2009 lunar days count is 384');
});
test("lunar.getLunarYearMonths", function() {
	equal(lunar.getLunarYearMonths(2011)[11], 354, '2011 lunar days count is 354');
	equal(lunar.getLunarYearMonths(2010)[11], 354, '2010 lunar days count is 354');
	equal(lunar.getLunarYearMonths(2009)[12], 384, '2009 lunar days count is 384');
});
test("lunar.getLeapMonth", function() {
	equal(lunar.getLeapMonth(2011), 0, 'no leap month');
	equal(lunar.getLeapMonth(2010), 0, 'no leap month');
	equal(lunar.getLeapMonth(2009), 5, 'leap the 5th month');
});
test("lunar.getDaysBetweenLunar", function() {
	equal(lunar.getDaysBetweenLunar(2011, 1, 1), 0, 'the same day');
	equal(lunar.getDaysBetweenLunar(2010, 2, 1), 30, '30 days in 1 month');
	equal(lunar.getDaysBetweenLunar(2009, 2, 1), 30, '30 days in 1 month');
});
test("lunar.getDaysBetweenSolar", function() {
	equal(lunar.getDaysBetweenSolar(2011, 1, 1, 1, 2), 1, '2011.1.1 - 1.2, 1 day, ok');
	equal(lunar.getDaysBetweenSolar(2010, 2, 1, 3, 1), 28, '2010.2.1 - 3.1, 28 days ok');
	equal(lunar.getDaysBetweenSolar(2009, 1, 1, 2, 1), 31, '2009.1.1 - 2.1, 31 days ok');
});
test("lunar.getLunarByBetween", function() {
	var converted = lunar.getLunarByBetween(2012, 2);
	equal(converted[1], '正月', 'ok');
	equal(converted[2], '初三', 'ok');
	equal(converted[3], '壬辰', 'ok');
	equal(converted[4], '1', 'ok');
	equal(converted[5], '3', 'ok');
	equal(converted[6], '龙', 'ok');
});
test("lunar.getCapitalNum", function() {
	equal(lunar.getCapitalNum(10), '初十', '10 is 初十');
	equal(lunar.getCapitalNum(11), '十一', '11 is 十一');
	equal(lunar.getCapitalNum(10, true), '十月', '10 is 十月');
	equal(lunar.getCapitalNum(11, true), '冬月', '11 is 冬月');
	equal(lunar.getCapitalNum(12, true), '腊月', '12 is 腊月');
});

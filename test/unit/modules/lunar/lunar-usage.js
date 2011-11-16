module('lunar-usage');

object.use('lunar', function(exports, lunar) {
	window.lunar = lunar;
});

test("lunar.solarToLunar", function(){
	console.log(lunar.solarToLunar(2011, 11, 15));
}); 				
test("lunar.lunarToSolar", function(){});
test("lunar.isLeapYear", function(){}); 
test("lunar.getLunarYearName", function() {});
test("lunar.getYearZodiac", function() {});
test("lunar.getSolarMonthDays", function() {});
test("lunar.getLunarMonthDays", function() {});
test("lunar.getLunarMonths", function() {});
test("lunar.getLunarMonthsLength", function() {});
test("lunar.getLunarMonthNames", function() {});
test("lunar.getLunarDates", function() {});
test("lunar.getMaxLunarDates", function() {});
test("lunar.getLunarYearDays", function() {});
test("lunar.getLunarYearMonths", function() {});
test("lunar.getLeapMonth", function() {});
test("lunar.getDaysBetweenLunar", function() {});
test("lunar.getDaysBetweenSolar", function() {});
test("lunar.getLunarByBetween", function() {});
test("lunar.getCapitalNum", function() {});
test("lunar.solarToLunar", function() {});

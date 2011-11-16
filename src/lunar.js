object.add('lunar', function(exports) {

/**
 * 公历农历的互相转换
 * copyright @ http://ctc.qzs.qq.com/qzone/newprofile/scripts/solarlunar.js
 */
var MIN_YEAR = 1891,
	MAX_YEAR = 2100,
	SKY=['庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
	EARTH=['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
    ZODIAC=['猴','鸡','狗','猪','鼠','牛','虎','兔','龙','蛇','马','羊'],
	MONTH_HASH=['', '正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'],
	DATE_HASH=['', '一','二','三','四','五','六','七','八','九','十'];

var LUNAR_INFO = [[0,2,9,21936],  [6,1,30,9656], [0,2,17,9584], [0,2,6,21168], [5,1,26,43344],[0,2,13,59728],
	[0,2,2,27296], [3,1,22,44368],[0,2,10,43856],[8,1,30,19304],[0,2,19,19168],[0,2,8,42352], [5,1,29,21096],
	[0,2,16,53856],[0,2,4,55632], [4,1,25,27304],[0,2,13,22176],[0,2,2,39632], [2,1,22,19176],[0,2,10,19168],
	[6,1,30,42200],[0,2,18,42192],[0,2,6,53840], [5,1,26,54568],[0,2,14,46400],[0,2,3,54944], [2,1,23,38608],
	[0,2,11,38320],[7,2,1,18872], [0,2,20,18800],[0,2,8,42160], [5,1,28,45656],[0,2,16,27216],[0,2,5,27968],
	[4,1,24,44456],[0,2,13,11104],[0,2,2,38256], [2,1,23,18808],[0,2,10,18800],[6,1,30,25776],[0,2,17,54432],
	[0,2,6,59984], [5,1,26,27976],[0,2,14,23248],[0,2,4,11104], [3,1,24,37744],[0,2,11,37600],[7,1,31,51560],
	[0,2,19,51536],[0,2,8,54432], [6,1,27,55888],[0,2,15,46416],[0,2,5,22176], [4,1,25,43736],[0,2,13,9680],
	[0,2,2,37584], [2,1,22,51544],[0,2,10,43344],[7,1,29,46248],[0,2,17,27808],[0,2,6,46416], [5,1,27,21928],
	[0,2,14,19872],[0,2,3,42416], [3,1,24,21176],[0,2,12,21168],[8,1,31,43344],[0,2,18,59728],[0,2,8,27296],
	[6,1,28,44368],[0,2,15,43856],[0,2,5,19296], [4,1,25,42352],[0,2,13,42352],[0,2,2,21088], [3,1,21,59696],
	[0,2,9,55632], [7,1,30,23208],[0,2,17,22176],[0,2,6,38608], [5,1,27,19176],[0,2,15,19152],[0,2,3,42192],
	[4,1,23,53864],[0,2,11,53840],[8,1,31,54568],[0,2,18,46400],[0,2,7,46752], [6,1,28,38608],[0,2,16,38320],
	[0,2,5,18864], [4,1,25,42168],[0,2,13,42160],[10,2,2,45656],[0,2,20,27216],[0,2,9,27968], [6,1,29,44448],
	[0,2,17,43872],[0,2,6,38256], [5,1,27,18808],[0,2,15,18800],[0,2,4,25776], [3,1,23,27216],[0,2,10,59984],
	[8,1,31,27432],[0,2,19,23232],[0,2,7,43872], [5,1,28,37736],[0,2,16,37600],[0,2,5,51552], [4,1,24,54440],
	[0,2,12,54432],[0,2,1,55888], [2,1,22,23208],[0,2,9,22176], [7,1,29,43736],[0,2,18,9680], [0,2,7,37584],
	[5,1,26,51544],[0,2,14,43344],[0,2,3,46240], [4,1,23,46416],[0,2,10,44368],[9,1,31,21928],[0,2,19,19360],
	[0,2,8,42416], [6,1,28,21176],[0,2,16,21168],[0,2,5,43312], [4,1,25,29864],[0,2,12,27296],[0,2,1,44368],
	[2,1,22,19880],[0,2,10,19296],[6,1,29,42352],[0,2,17,42208],[0,2,6,53856], [5,1,26,59696],[0,2,13,54576],
	[0,2,3,23200], [3,1,23,27472],[0,2,11,38608],[11,1,31,19176],[0,2,19,19152],[0,2,8,42192],[6,1,28,53848],
	[0,2,15,53840],[0,2,4,54560], [5,1,24,55968],[0,2,12,46496],[0,2,1,22224], [2,1,22,19160],[0,2,10,18864],
	[7,1,30,42168],[0,2,17,42160],[0,2,6,43600], [5,1,26,46376],[0,2,14,27936],[0,2,2,44448], [3,1,23,21936],
	[0,2,11,37744],[8,2,1,18808], [0,2,19,18800],[0,2,8,25776], [6,1,28,27216],[0,2,15,59984],[0,2,4,27424],
	[4,1,24,43872],[0,2,12,43744],[0,2,2,37600], [3,1,21,51568],[0,2,9,51552], [7,1,29,54440],[0,2,17,54432],
	[0,2,5,55888], [5,1,26,23208],[0,2,14,22176],[0,2,3,42704], [4,1,23,21224],[0,2,11,21200],[8,1,31,43352],
	[0,2,19,43344],[0,2,7,46240], [6,1,27,46416],[0,2,15,44368],[0,2,5,21920], [4,1,24,42448],[0,2,12,42416],
	[0,2,2,21168], [3,1,22,43320],[0,2,9,26928], [7,1,29,29336],[0,2,17,27296],[0,2,6,44368], [5,1,26,19880],
	[0,2,14,19296],[0,2,3,42352], [4,1,24,21104],[0,2,10,53856],[8,1,30,59696],[0,2,18,54560],[0,2,7,55968],
	[6,1,27,27472],[0,2,15,22224],[0,2,5,19168], [4,1,25,42216],[0,2,12,42192],[0,2,1,53584], [2,1,21,55592],
	[0,2,9,54560]];

/**
 * 将阳历转换为阴历
 *
 * @param year  公历-年
 * @param month 公历-月
 * @param date  公历-日
 */
this.convertSolarToLunar = function(year, month, date) {
    var yearData = LUNAR_INFO[year - MIN_YEAR];
    if (year == MIN_YEAR && month <= 2 && date <= 9) {
    	return [MIN_YEAR, '正月', '初一', '辛卯', 1, 1,'兔'];
    }
    return exports.getLunarByBetween(year,
			exports.getDaysBetweenSolar(year, month, date, yearData[1], yearData[2]));
}

/**
 * 将阴历转换为阳历
 *
 * @param year  阴历-年
 * @param month 阴历-月，闰月处理：例如如果当年闰五月，那么第二个五月就传六月，相当于阴历有13个月，只是有的时候第13个月的天数为0
 * @param date  阴历-日
 */
this.convertLunarToSolar = function(year, month, date) {
    var yearData = LUNAR_INFO[year - MIN_YEAR], 
		res = new Date(year, yearData[1]-1, yearData[2]), 
		between = exports.getDaysBetweenLunar(year, month, date);

    res.setDate(res.getDate() + between);
    return [res.getFullYear(), res.getMonth()+1, res.getDate()];
}

/**
 * 判断是否是闰年
 *
 * @param year
 */
this.isLeapYear = function(year) {
    return ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0));
}

/**
 * 获取干支纪年
 *
 * @param year
 */
this.getLunarYearName = function(year) {
   return SKY[(year + "").charAt(3)] + EARTH[year % 12];
}

/**
 * 根据阴历年获取生肖
 *
 * @param year  阴历年
 */
this.getYearZodiac = function(year) {
    return ZODIAC[year % 12];
}

/**
 * 获取阳历月份的天数
 *
 * @param year  阳历-年
 * @param month 阳历-月
 */
this.getSolarMonthDays = function(year, month) {
    var monthDaysHash={1: 31, 2:(exports.isLeapYear(year) ? 29 : 28), 
		3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
    return monthDaysHash[month];
}

/**
 * 获取阴历月份的天数
 *
 * @param year  阴历-年
 * @param month 阴历-月，从一月开始
 */
this.getLunarMonthDays = function(year, month) {
    var monthData = exports.getLunarMonths(year);
    return monthData[month - 1];
}

/**
 * 获取阴历每月的天数的数组
 *
 * @param year
 */
this.getLunarMonths = function(year) {
    var yearData = LUNAR_INFO[year - MIN_YEAR],
		leapMonth = yearData[0],
		bitArray = (yearData[3]).toString(2).split('');
	for (var k = 0, klen = 16 - bitArray.length; k < klen; k++) {
		bitArray.unshift('0');
	}
	bitArray = bitArray.slice(0, (leapMonth == 0 ? 12 : 13));
    for (var i = 0, len = bitArray.length; i < len; i++) {
        bitArray[i] = parseInt(bitArray[i]) + 29;
    }

    return bitArray;
}

/**
 * 获取农历每年的月数
 *
 * @param year 农历年份
 */
this.getLunarMonthsLength = function(year) {
    return exports.getLunarMonths(year).length;
}

/**
 * 获取农历每年的月份名称列表
 *
 * @param year 农历年份
 */
this.getLunarMonthNames = function(year) {
	var leapMonth = exports.getLeapMonth(year),
		monthNames = [],
		monthHash = MONTH_HASH.slice(1); // remove first element
		monthSum = (leapMonth == 0 ? 12 : 13);
	if (leapMonth) {
		monthHash.splice(leapMonth, 0, '闰' + monthHash[leapMonth - 1]);
	}
	for (var i = 0; i < monthSum; i++) {
		monthNames.push(monthHash[i]);
	}
	return monthNames;
}
/**
 * 根据阴历年月获取每月天数信息
 */
this.getLunarDates = function(year, month) {
	var dates=[];
	var days = exports.getLunarMonthDays(year,month);
	for (var i = 1; i <= days; i++) {
		dates.push(exports.getCapitalNum(i, false));
	}
	return dates;
}

this.getMaxLunarDates = function() {
	var dates = [];
	for (var i = 1; i <= 30; i++) {
		dates.push(exports.getCapitalNum(i, false));
	}
	return dates;
}
 
/**
 * 获取农历每年的天数
 *
 * @param year 农历年份
 */
this.getLunarYearDays = function(year) {
    var yearData = LUNAR_INFO[year - MIN_YEAR],
		monthArray = exports.getLunarYearMonths(year),
		len = monthArray.length;
    return (monthArray[len - 1] == 0 ? monthArray[len - 2] : monthArray[len - 1]);
}

this.getLunarYearMonths = function(year) {
    var monthData = exports.getLunarMonths(year),
		res = [], temp = 0, 
		yearData = LUNAR_INFO[year - MIN_YEAR],
		len = (yearData[0] == 0 ? 12 : 13);
    for (var i = 0; i < len; i++) {
        temp = 0;
        for (var j = 0; j <= i; j++) {
            temp += monthData[j];
        }
        res.push(temp);
    }
    return res;
}

/**
 * 获取闰月
 *
 * @param year 阴历年份
 */
this.getLeapMonth = function(year) {
	if (year < MIN_YEAR) {
		return 0;
	}
    var yearData = LUNAR_INFO[year - MIN_YEAR];
    return yearData[0];
}

/**
 * 计算阴历日期与正月初一相隔的天数
 *
 * @param year
 * @param month
 * @param date
 */
this.getDaysBetweenLunar = function(year, month, date) {
    var yearMonth = exports.getLunarMonths(year), res = 0;
    for (var i = 1; i < month; i++) {
        res += yearMonth[i - 1];
    }
    res += date - 1;
    return res;
}

/**
 * 计算2个阳历日期之前的天数
 *
 * @param year 阳历年
 * @param cmonth
 * @param cdate
 * @param dmonth 阴历正月对应的阳历月份
 * @param ddate 阴历初一对应的阳历月份
 */
this.getDaysBetweenSolar = function(year, cmonth, cdate, dmonth, ddate) {
    var a = new Date(year, cmonth - 1, cdate),
		b = new Date(year, dmonth - 1, ddate);
    return Math.ceil(Math.abs(a - b) / 24 / 3600 / 1000);
}

/**
 * 根据距离正月初一的天数计算阴历日期
 *
 * @param year  阳历年
 * @param between 天数
 */
this.getLunarByBetween = function(year, between) {
    var lunarArray = [], yearMonth = [], t = 0, e = 0, leapMonth = 0, m = '';
    if (between == 0) {
        lunarArray.push(year, '正月', '初一');
    } else {
        year = between > 0 ? year : (year - 1);
        yearMonth = exports.getLunarYearMonths(year);
        leapMonth = exports.getLeapMonth(year);
        between = between > 0 ? between : (exports.getLunarYearDays(year) + between);
        for (var i = 0; i < 13; i++) {
            if (between == yearMonth[i]) {
                t = i + 2;
                e = 1;
                break;
            } else if (between < yearMonth[i]) {
                t = i + 1;
                e = between - (yearMonth[i - 1] == undefined ? 0 : yearMonth[i - 1]) + 1;
                break;
            }
        }
        m = (leapMonth != 0 && t == leapMonth + 1) ? ('闰' + exports.getCapitalNum(t - 1, true))
			: exports.getCapitalNum((leapMonth != 0 && leapMonth + 1 < t ? (t - 1) : t), true);
        lunarArray.push(year, m, exports.getCapitalNum(e, false));
    }
	lunarArray.push(exports.getLunarYearName(year));//天干地支
	lunarArray.push(t, e);
    lunarArray.push(exports.getYearZodiac(year));//12生肖
    
    return lunarArray;
}

/**
 * 获取数字的阴历叫法
 *
 * @param num  数字
 * @param isMonth 是否是月份的数字
 */
this.getCapitalNum = function(num, isMonth) {
    isMonth = isMonth || false;
    var res = '';

    if (isMonth) {
        res = MONTH_HASH[num];
    } else {
        if (num <= 10) {
            res = '初' + DATE_HASH[num];
        } else if (num > 10 && num < 20) {
            res = '十' + DATE_HASH[num - 10];
        } else if (num == 20) {
            res = "二十";
        } else if (num > 20 && num < 30) {
            res = "廿" + DATE_HASH[num - 20];
        } else if (num == 30) {
            res = "三十";
        }
    }
    return res;
}

});

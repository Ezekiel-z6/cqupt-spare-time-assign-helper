/**
 *
 * 不要修改其中的代码
 *
 * @author: 漠北
 * @version: 1.0.0
 * @time: 2020-12-01
 */
const { stu, THISWEEK, WEEKEND, EVE2 } = require("./config");
const chalk = require("chalk");
const request = require("request");
const cheerio = require("cheerio");
const fs = require("fs");
/**
 *
 * 学生辅助类
 *
 */
class Student {
  constructor(name, id) {
    this.name = name;
    this.id = id;
    this.spareTime = new Array(6).fill(1).map((el) => {
      return new Array(7).fill(true);
    });
  }
  setBusy(time, day) {
    this.spareTime[time][day] = false;
  }
  isBusy(time, day) {
    return !this.spareTime[time][day];
  }
}

/**
 *
 * 获取学生空余时间矩阵表示
 *
 * @param {Student} student Object
 */
function getSpareTime(student) {
  console.log(chalk.blue(`正在处理 ${student.id} ${student.name}`));
  return new Promise(function (resolve, reject) {
    request(
      `http://jwzx.cqupt.edu.cn/kebiao/kb_stu.php?xh=${student.id}`,
      (error, response, body) => {
        if (error) {
          console.log(chalk.red("错误"));
          console.log(chalk.red(error));
        }
        if (response.statusCode === 200) {
          let $ = cheerio.load(body);
          let rows = $("#stuPanel table:nth-of-type(1) tbody tr")
            .toArray()
            .filter(
              (el) =>
                !["中午间歇", "下午间歇"].includes(
                  $(el).children().first().text()
                )
            );
          for (let time = 0; time < rows.length; time++) {
            handleRow(rows[time], time, student);
          }
        }
        console.log(chalk.gray("成功获取课表信息"));
        resolve();
      }
    );
  });
}
/**
 *
 * 处理td中的div课程
 *
 * @param {Cheerio} row
 * @param {Number} time
 * @param {Student} student
 */
function handleRow(row, time, student) {
  let tds = cheerio.load(row)("td:not([style])").toArray();
  for (let day = 0; day < 7; day++) {
    let divs = cheerio.load(tds[day])("div").toArray();
    for (const el of divs) {
      if (el.attribs.zc.charAt(THISWEEK - 1) == 1) {
        student.setBusy(time, day);
      }
    }
  }
}
/**
 *
 * 聚合所有学生的空闲时间
 *
 * @param {Array} stus
 * @param {Array} totalSpareTime
 */
function generateSpareTimeList(stus, totalSpareTime) {
  const WEEKDAY = WEEKEND
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["一", "二", "三", "四", "五"];
  const TIME = EVE2
    ? ["1,2节", "3,4节", "5,6节", "7,8节", "9,10节", "11,12节"]
    : ["1,2节", "3,4节", "5,6节", "7,8节", "9,10节"];

  for (let time = 0; time < TIME.length; time++) {
    for (let day = 0; day < WEEKDAY.length; day++) {
      let names = [];
      stus.forEach((el) => {
        if (!el.isBusy(time, day)) {
          names.push(el.name);
        }
      });
      if (names.length == 0) {
        continue;
      }
      totalSpareTime.push({
        count: names.length,
        names,
        weekday: WEEKDAY[day],
        time: TIME[time],
      });
    }
  }
  totalSpareTime.sort((v1, v2) => v2.count - v1.count);
}
async function main() {
  console.log(chalk.yellow("正在获取所有人课表"));
  let stus = stu.map((el) => {
    return new Student(el.name, el.id);
  });
  for (const el of stus) {
    await getSpareTime(el);
  }
  console.log(chalk.yellow("正在处理空闲信息"));
  let totalSpareTime = [];
  generateSpareTimeList(stus, totalSpareTime);
  console.log(chalk.yellow("处理完成，数据如下"));
  console.log(totalSpareTime);
  fs.writeFileSync(
    `./spareTime_WEEK_${THISWEEK}.json`,
    JSON.stringify(totalSpareTime, null, 4)
  );
  console.log(chalk.yellow(`数据已输出到spareTime_WEEK_${THISWEEK}.json`));
}

main();

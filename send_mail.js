const nodemailer = require("nodemailer");
const Intl = require("intl");
const { Pool, Client } = require("pg");
const moment = require("moment");

var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// GUEST
const pool = new Pool({
  connectionString:
    "postgres://Leanhdung2881999:iW6Vyjsm3KFD@delicate-thunder-803373.cloud.neon.tech/main?options=project%3Ddelicate-thunder-803373&sslmode=require",
  ssl: {
    rejectUnauthorized: false,
  },
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "<fill-gmail>@gmail.com",
    pass: "<fill-password>",
  },
});
const date = new Date();
const lastDate = date.setMonth(date.getMonth() - 1);
const lastYear = new Date().setFullYear(new Date().getFullYear() - 1);
const timeNow = moment(lastDate).format("MMMM").toUpperCase();

const startDate = new Date(new Date(lastDate).setDate(0));
const endDate = new Date(new Date().setDate(0));

const startYear = new Date(lastYear);
const endYear = new Date();
console.log(startYear);
console.log(endYear);

const dataChartPie = (value, dataChart, color) => {
  var backgroundColor = [];
  var data = [];
  if (dataChart.length > 0) {
    for (var i = 0; i < dataChart.length; i++) {
      backgroundColor.push(color[i]);
      data.push(parseInt((dataChart[i] / value) * 100));
    }
  } else {
    backgroundColor.push("white");
    data.push(100);
  }

  return {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColor,
          datalabels: {
            display: dataChart.length > 0 ? true : false,
            color: "white",
          },
        },
      ],
    },
    options: {
      legend: {
        display: false,
      },
    },
  };
};

const header = (nameUser) => {
  return `
    <div style="width:100%; padding:24px; display: flex; align-items: center; justify-content: space-between;">
      <img src="https://user-images.githubusercontent.com/79369571/184800061-c14b1e30-9aae-467a-bc73-1127d70328c8.png" alt="Logo" width="56px" height="56px">
      <div style="text-align: right; margin-left:50px; padding-left:50px">
        <div style="font-family:Mulish; font-size:14px; color: #414742;font-weight: 500;">Hi, ${nameUser}</div>
        <div style="font-family:Mulish; font-size:18px; color: #414742;font-weight: 600;">HERE’S HOW ${timeNow} LOOK!</div>
      </div>
    </div>
  `;
};

const img = (total, chartData) => {
  return `https://quickchart.io/chart?c=${JSON.stringify(
    dataChartPie(total, chartData, ["darkorchid", "tomato"])
  )}`;
};

const category = (title, money, percent, color) => {
  return `
    <div align="left"; style="background-color:#FFFFFF; border-radius: 12px; width: 164px; height:112px; margin-left: 20px; padding: 16px">
      <div style="display: flex; align-items: center;">
        <div style='width:16px; height:16px; background-color:${color}; margin-right:8px;'></div>
        <div style="font-family:Mulish;font-size:16px; color: #252827;">
        ${title}
        </div>
      </div>
      <p style="font-family:Mulish;font-size:17px; color: #414742;font-weight: 600;">
        ${formatter.format(money)}
      </p>
      <p style="font-family:Mulish;font-size:1  2px; color: #9C9E9D;">
        ${percent}%
      </p>
    </div>
  `;
};

const centerChart = (totalIncome, totalExpense) => {
  const chartData = [totalIncome, totalExpense];
  const total = totalIncome + totalExpense;
  return `
  <div align="center">
    <img src=${img(
      total,
      chartData
    )} alt='chart' height='250' width='400' margin-bottom: 42px;/>
    <div style='display: flex;margin-top: 42px;'>
        <div>
            ${category(
              "Income",
              totalIncome,
              total == 0 ? 0 : parseInt((totalIncome / total) * 100),
              "darkorchid"
            )}
        </div>
        <div>
            ${category(
              "Expense",
              totalExpense,
              total == 0 ? 0 : parseInt((totalExpense / total) * 100),
              "tomato"
            )}
        </div>
    </div>
  </div>`;
};

const getAllUser = async () => {
  const userRes = await pool.query(
    'SELECT * FROM public."User" WHERE date_premium IS NOT NULL AND date_premium BETWEEN $1 AND $2',
    [startYear, endYear]
  );
  users = userRes.rows;
  console.log(users);
  return users;
};

module.exports = function () {
  getAllUser().then((userAll) => {
    userAll.forEach(async (user) => {
      const walletRes = await pool.query(
        'SELECT id FROM public."Wallet" WHERE user_uuid=$1',
        [user.uuid]
      );
      listWalletId = walletRes.rows;
      const newWalletIds = listWalletId.map((value) => {
        return value.id;
      });

      if (newWalletIds.length === 0) {
        return;
      }
      const totalIncomeRes = await pool.query(
        'SELECT SUM (balance) AS income FROM public."Transaction" WHERE date BETWEEN $1 AND $2 AND type=$3 AND wallet_id IN($4)',
        [startDate, endDate, "income", newWalletIds]
      );
      totalIncome = totalIncomeRes.rows;

      const totalExpenseRes = await pool.query(
        'SELECT SUM (balance) AS expense FROM public."Transaction" WHERE date BETWEEN $1 AND $2 AND type=$3 AND wallet_id IN($4)',
        [startDate, endDate, "expense", newWalletIds]
      );
      totalExpense = totalExpenseRes.rows;
      const income = totalIncome[0].income || 0;
      const expense = totalExpense[0].expense || 0;
      transporter
        .sendMail({
          from: '"Timistudio" <timistudio20181129@gmail.com>',
          to: user.email,
          subject: "Your spending statistics last month",
          html: `
          <div style='background-color:#F9F9F9;width:450px'>
            ${header(user.name)}
            <div align='center'; style='display: flex; margin-top: 42px;margin-bottom: 24px; width:400px'>
              ${centerChart(income || 0, expense || 0)}
            </div>
            <div style="text-align: center;font-family:Mulish; font-size:14px; color: #252827;font-weight: 500;padding-bottom:24px;">Great! You ${
              income - expense >= 0 ? "save" : "waste"
            } <span style="font-family:Mulish; font-size:17px; color: #252827;font-weight: 700;">${formatter.format(
            parseFloat(Math.abs(income - expense).toFixed(2))
          )} USD</span> last month!</div>
          </div>
        `,
        })
        .catch(console.error);
    });
  });
};

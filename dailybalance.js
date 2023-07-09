var axios = require('axios');
var fs = require('fs');
var PATH = 'https://jpvxtx67i7w2q5rlvcz5j5vjha0dqwkw.lambda-url.us-east-2.on.aws/';
// Helper functions
var getSkippedDays = function (startDate, nextDate) {
    var curr = new Date(startDate);
    var next = new Date(nextDate);
    var delta = curr.getTime() - next.getTime();
    var dayDiff = Math.floor(delta / (1000 * 3600 * 24));
    return dayDiff;
};
// MAIN FUNCTION for parsing mock API and writing to EODHistory.json
axios.get(PATH)
    .then(function (response) {
    var account = response.data.account;
    var transactions = response.data.transactions;
    //get current balance from account data
    var currentBalance = parseFloat(account.balances.current);
    //get starting date
    var currentDate = transactions[0].date;
    var pos = 0;
    var history = [];
    while (pos < transactions.length) {
        if (currentDate === transactions[pos].date) {
            currentBalance += parseFloat(transactions[pos].amount);
            console.log(currentDate, "adding balance ", transactions[pos].amount, " to balance");
        }
        else {
            console.log("Creating snapshot of ", currentDate, " with balance ", currentBalance);
            // create and add the current end of day account state to history
            var state = {
                date: new Date(currentDate).toLocaleString('en-US', { dateStyle: 'short' }),
                balance: {
                    amount: Math.round(currentBalance * 100) / 100
                }
            };
            history.push(state);
            // Check if there are any 0 transaction days with helper function. Condition : dayDiff is > 1
            var dayDiff = getSkippedDays(currentDate, transactions[pos].date);
            console.log("there are ", dayDiff, " days missed between ", currentDate, " and the next date ", transactions[pos].date);
            var savedDate = new Date(currentDate);
            while (dayDiff > 1) {
                savedDate.setDate(savedDate.getDate() - 1);
                var skippedstate = {
                    date: savedDate.toLocaleString('en-US', { dateStyle: 'short' }),
                    balance: {
                        amount: Math.round(currentBalance * 100) / 100
                    }
                };
                console.log("Adding new date ", savedDate.toLocaleString('en-US', { dateStyle: 'short' }), "with same balance ", currentBalance);
                history.push(skippedstate);
                dayDiff--;
            }
            //increment the date and modify current balance
            currentDate = transactions[pos].date;
            currentBalance += parseFloat(transactions[pos].amount);
        }
        pos++;
    }
    // handle final straggler state (whatever current state and balance is left art at end of while loop)
    var finalState = {
        date: new Date(currentDate).toLocaleString("en-US", { dateStyle: 'short' }),
        balance: {
            amount: Math.round(currentBalance * 100) / 100
        }
    };
    history.push(finalState);
    // write history array to JSON file in directory...
    var historyData = JSON.stringify(history);
    fs.writeFile("EODhistory.json", historyData, function (err) {
        if (err) {
            console.log(err);
            throw err;
        }
        console.log("EOD history data written correctly");
    });
})
    .catch(function (err) {
    console.error("There was an error in fetching data: ", err);
});

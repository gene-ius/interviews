const axios = require('axios')
const fs  = require('fs')

const PATH = 'https://jpvxtx67i7w2q5rlvcz5j5vjha0dqwkw.lambda-url.us-east-2.on.aws/'

// Interface for JSON formatting
interface accountState {
    date: string
    balance: {
        amount: number
    }
}

// Helper functions
const getSkippedDays = (startDate, nextDate) => {
    const curr = new Date(startDate)
    const next = new Date(nextDate)
    const delta = curr.getTime() - next.getTime()

    const dayDiff = Math.floor( delta / ( 1000 * 3600 * 24))
    return dayDiff
}

// MAIN FUNCTION for parsing mock API and writing to EODHistory.json
axios.get(PATH)
.then(response => {

    const account = response.data.account
    const transactions = response.data.transactions

    //get current balance from account data
    let currentBalance = parseFloat(account.balances.current)
    //get starting date
    let currentDate = transactions[0].date
    let pos = 0

    let history : Array<accountState> = []

    while (pos < transactions.length) {

        if (currentDate === transactions[pos].date) {

            currentBalance += parseFloat(transactions[pos].amount)
            console.log(currentDate, "adding balance ", transactions[pos].amount, " to balance")

        }
        else {

            console.log ("Creating snapshot of ", currentDate, " with balance ", currentBalance)
            // create and add the current end of day account state to history
            const state: accountState = {
                date: new Date(currentDate).toLocaleString('en-US', {dateStyle: 'short'}),
                balance: {
                    amount: Math.round(currentBalance * 100) / 100
                }
            }
            history.push(state)

            // Check if there are any 0 transaction days with helper function. Condition : dayDiff is > 1
            let dayDiff = getSkippedDays(currentDate, transactions[pos].date)
            console.log("there are ", dayDiff, " days missed between ", currentDate, " and the next date ", transactions[pos].date)
            const savedDate = new Date(currentDate)
            while (dayDiff > 1) {
                savedDate.setDate(savedDate.getDate() - 1)
                const skippedstate: accountState = {
                    date: savedDate.toLocaleString('en-US', { dateStyle: 'short'}),
                    balance: {
                        amount: Math.round(currentBalance * 100) / 100
                    }
                }
                console.log("Adding new date ", savedDate.toLocaleString('en-US', { dateStyle: 'short'}), "with same balance ", currentBalance)
                history.push(skippedstate)
                dayDiff--
            }
            //increment the date and modify current balance
            currentDate = transactions[pos].date
            currentBalance += parseFloat(transactions[pos].amount)
        }
        pos++
    }

    // handle final straggler state (whatever current state and balance is left art at end of while loop)
    const finalState : accountState = {
        date: new Date(currentDate).toLocaleString("en-US", {dateStyle: 'short'}),
        balance: {
            amount: Math.round(currentBalance * 100) / 100
        }
    }

    history.push(finalState)

    // write history array to JSON file in directory...

    const historyData = JSON.stringify(history)

    fs.writeFile("EODhistory.json", historyData, (err) => {
        if (err) {
            console.log(err)
            throw err
        }

        console.log("EOD history data written correctly")
    })
})
.catch(err => {
    console.error("There was an error in fetching data: " , err)
})










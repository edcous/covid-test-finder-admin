// packages needed in this file
const express = require('express')
// creating express route handler
const router = express.Router()

const Stock = require('../../models/stock.js')

router.post('/delete', async (req, res) => {
    const ID = req.body["id"]
    if(ID == ""){
        res.status(400).send('Please make sure an ID is entered.')
    }
    else{
        Stock.count({_id: ID}, function (err, count){ 
            if(count>0){
                Stock.deleteOne({_id: ID}, (err, result) => {
                    if (err) return console.log(err)
                    res.status(200).send('Done!')
                })    
            }
            else{
                res.status(400).send('A stock with ID ' + ID + ' was not found.')
            }
        }); 
    }
})
module.exports = router
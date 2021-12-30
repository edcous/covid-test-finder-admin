// packages needed in this file
const express = require('express')
// creating express route handler
const router = express.Router()

const Type = require('../../models/type.js')

router.post('/create', async (req, res) => {
    const name = req.body["name"]
    if(name == ""){
        res.status(400).send('Please make sure a name is entered.')
    }
    else{
        console.log('creating type with name ' + name)
        Type.create({ testName: name })
        res.send('done!')
    }
})
module.exports = router
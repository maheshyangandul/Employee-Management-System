require('dotenv').config();
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

// const bcrypt = require('bcrypt'); // https://www.npmjs.com/package/bcrypt npm i bcrypt
var jwt = require('jsonwebtoken'); //https://github.com/auth0/node-jsonwebtoken npm install jsonwebtoken
const jwtKey = 'rds';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

var con = mysql.createConnection({
    user: 'root',
    host: process.env.SQL_URL,
    password: 'password',
    database: 'rds'
});

con.connect(function (err) {
    if (err) {
        console.error('Error in connection.');
        return;
    } else {
        console.error('Connected');
    }
});

app.get('/', verifyToken, (req, res) => {
    res.send('Hello World!')
})

app.get('/getEmployee', verifyToken, (req, res) => {
    const sql = "select * from employee";
    con.query(sql, (err, result) => {
        if (err) return res.json({ error: "Get employee error in sql" });
        return res.json({ status: "success", result: result })
    })
})

app.post('/create', verifyToken, (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const address = req.body.address;
    const salary = req.body.salary;

    con.query("INSERT INTO employee (name, email, address, salary) VALUES (?, ?, ?, ?)", [name, email, address, salary],
        (err, result) => {
            if (result) {
                res.send(result);
            } else {
                res.send({ message: "ENTER CORRECT DETAILS!" })
            }
        }
    )
})

app.get('/get/:id', verifyToken, (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee where id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Error: "Get employee error in sql" });
        return res.json({ Status: "Success", Result: result })
    })
})

app.put("/update/:id", verifyToken, (req, res) => {
    const userId = req.params.id;
    const q = "UPDATE employee SET `name`= ?, `email`= ?, `salary`= ?, `address`= ? WHERE id = ?";

    const values = [
        req.body.name,
        req.body.email,
        req.body.salary,
        req.body.address,
    ];

    con.query(q, [...values, userId], (err, data) => {
        if (err) return res.send(err);
        return res.json(data);
        //return res.json({Status: "Success"})
    });
});

app.delete('/delete/:id', verifyToken, (req, res) => {
    const id = req.params.id;
    const sql = "Delete FROM employee WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Error: "delete employee error in sql" });
        return res.json({ Status: "Success" })
    })
})

app.get('/employeeCount', (req, res) => {
    const sql = "Select count(id) as employee from employee";
    con.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Error in runnig query" });
        return res.json(result);
    })
})

app.get('/salary', (req, res) => {
    const sql = "Select sum(salary) as sumOfSalary from employee";
    con.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Error in runnig query" });
        return res.json(result);
    })
})

app.get('/adminCount', (req, res) => {
    const sql = "Select count(id) as admin from users";
    con.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Error in runnig query" });
        return res.json(result);
    })
})

app.post('/register', (req, res) => {
    const sql = "insert into users (name, email, password) values (?)";
    const values = [
        req.body.name,
        req.body.email,
        req.body.password
    ];

    con.query(sql, [values], (err, result) => {
        if (err) return res.json({ Error: "Error in register query" });
        // return res.json({ Status: "Success" });
        jwt.sign({ result }, jwtKey, { expiresIn: '2h' }, (err, token) => {
            if (err) {
                res.send({ result: "Something went wrong, Please try after sometime." })
            }
            res.send({ result: req.body.name, token: token })
        })
    })
})
// app.post('/register', (req, res) => {
//     const sql = "insert into users (name, email, password) values (?)";
//     bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
//         if (err) return res.json({ Error: "Error in hashing password" });
//         const values = [
//             req.body.name,
//             req.body.email,
//             hash
//         ];

//         con.query(sql, [values], (err, result) => {
//             if (err) return res.json({ Error: "Error in register query" });
//             return res.json({ Status: "Success" });
//         })
//     })
// })

app.post('/login', (req, res) => {
    const sql = "select * from users where email = ? and password = ?";
    con.query(sql, [req.body.email, req.body.password], (err, result) => {
        if (err) return res.json({ Status: "Error", Error: "Error in login query" });
        if (result.length > 0) {
            // const token = jwt.sign({ role: "admin" }, "jwt-secret-key", { expiresIn: '1d' });
            // return res.json({ Login: "Success", token: token })
            jwt.sign({ result }, jwtKey, { expiresIn: '2h' }, (err, token) => {
                if (err) {
                    res.send({ result: "Something went wrong, Please try after sometime." })
                }
                res.send({ user: result[0].name, token: token })
            })
        } else {
            return res.json({ status: "Error", Error: "Wrong Email or Password" })
        }
    })
})
// app.post('/login', (req, res) => {
//     const sql = "select * from users where email = ?";
//     con.query(sql, [req.body.email], (err, result) => {
//         if (err) return res.json({ Status: "Error", Error: "Error in login query" });
//         if (result.length > 0) {
//             bcrypt.compare(req.body.password, result[0].password, (err, response) => {
//                 if (err) return res.json({ Error: "Password Error" });
//                 if (response) {
//                     return res.json({ Status: "Success" })
//                 } else {
//                     return res.json({ Status: result[0].password, Error: req.body.password })
//                 }
//             })
//         } else {
//             return res.json({ status: "Error", Error: "Wrong Email or Password" })
//         }
//     })
// })

function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    // console.log("Middleware called", token);
    if (token) {
        jwt.verify(token, jwtKey, (err, valid) => {
            if (err) {
                res.status(401).send({ result: "Please provide valid token" })
            } else {
                next();
            }
        })
    } else {
        res.status(403).send({ result: "Please add token with header" })
    }
}

app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`)
})
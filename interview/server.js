const { timeStamp } = require('console');
const express=require('express')
const app=express.json()
const PORT=3000;

app.get('/food-item/', (req,res) => {
    res.status(201).json({"Name":name,
        "quantity(mg)":quantity,
        "calories":calories,
        "Protein":protein,
        "Carbs":carbs,
        "weight":weight
    });
});

monthWindow=[];
function sum(monthWindow){
    for (x in monthWindow){
        const result=(result+x).toFixed(4);
    }
}

function average(monthWindow){
    for (x in monthWindow){
        const result=(result+x)/monthWindow.length().toFixed(4);
    }
}

app.get('/:user_id/', (req,res) => {
    if(!isNaN(user_id)){
        res.status(404);
        console.log("Please enter valid number")
    }
    if(monthWindow.includes(user_id)){
        res.status(201).json({
            "calories":(calories),
            "Protein":sum(protein),
            "Carbs":sum(carbs),
            "Weight":average(weight)
        });
    }
});

app.post('/add-new-food-item/',(req,res)=>{
    const name=res.params.Name;
    const quantity=res.params.quantity;
    const calories=res.params.calories;
    const protein=res.params.Protein;
    const carbs=res.params.Carbs;
    const add_date= timeStamp.NOW();
    let Foodlist;
    Foodlist.push(name,quantity,calories,protein,carbs,add_date);
    console.log("Food item added to the list");
});

app.delete('/food-item/:name',(req,res)=>{
    console.log("food item deleted from list");
    Foodlist.delete(name);
})

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});




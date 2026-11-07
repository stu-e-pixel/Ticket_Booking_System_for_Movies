class HomeController{
    home(req,res){
        res.render('home',{
            title:"This is Home page"
        })
    }

}

module.exports=new HomeController()
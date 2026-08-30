class HomeController {
    constructor() {
        this.__controllerName = 'Home'
    }

    indexAction(request, response) {
        response.status(200).json({
            message: 'Express API is running!',
            controller: this.__controllerName,
        })
        response.end()
    }
}

export default HomeController

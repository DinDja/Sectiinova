
function redirectJson(data) {
    var json = JSON.parse(data);
    location.href=json.url;
   
}
(function() {
  'use strict';

  angular
    .module('app')
    .factory('recaptchaService', recaptchaService);
   
  recaptchaService.$inject = ['$http'];

  function recaptchaService($http) {
    return {
    	validar: function(recaptcha){
    		return new Promise(function(resolve,reject){
    			$http({	
        	        url: '/recaptcha',
        	        method: "POST",
        	        data: { recaptcha }
        	    })
        	    .then(function(response) {
        	    	if(response.data == 'true') {
        	    		resolve(true);	
        	    	}else{
        	    		reject(false);
        	    	}
        	    })
        	    .catch(function(response) { // optional
        	    	reject(false);
        	    })
    		}); 
    	}
    }
  }
})();


var Stasis = {

    config: {
        projectId: null,
        debug: false,
        trackPageView: true,
        trackUniqueVisitor: true,
        trackClientSideErrors: true
    },
    sent: [],
    
    init: function (config) {

        // Override the default configuration if a new configuration is provided
        if (config !== undefined) {
            this.config = Object.assign(this.config, config);
        }

        // Built in events
        if(this.config.trackPageView == true){
            if(Stasis.config.debug == true){
                console.log('Tracking page view');
            }
            window.stasisData = window.stasisData || [];
            window.stasisData.push({ event: 'page_view' });
        }

        // Track unique visitor
        if(this.config.trackUniqueVisitor == true){
            if(Stasis.config.debug == true){
                console.log('Tracking unique visitor');
            }
            this.trackUniqueVisitor();
        }

        if(this.config.trackClientSideErrors == true){
            if(Stasis.config.debug == true){
                console.log('Tracking client side errors');
            }
            this.trackClientSideErrors();
        }

        // Monitor the data layer
        this.monitorDataLayer();


    },
    
    trackClientSideErrors: function () {

        window.onerror = function (message, source, lineno, colno, error) {
    
            if(Stasis.config.debug == true){
                console.log('Client side error detected');
            }

            // If the error is in this script, ignore it to prevent infinite loop
            console.log(source);
            if (source.includes('sdk/stasis')) {
                if(Stasis.config.debug == true){
                    console.log('Error in Stasis script');
                }
                return;
            }

            var meta = {
                message: message,
                source: source,
                lineno: lineno,
                colno: colno,
                error: error
            };

            window.stasisData = window.stasisData || [];
            window.stasisData.push({ event: 'client_side_error' });
        
        }

    },

    reset: function() {

        // Reset the sent array
        Stasis.sent = [];

        // Reset the local storage
        localStorage.setItem('stasis', '{}');

        return 'Stasis has been reset';

    },

    trackUniqueVisitor: function () {

        var stasisLocal = localStorage.getItem('stasis') || '{}';

        try {
            stasisLocal = JSON.parse(stasisLocal);
        } catch (e) {
            stasisLocal = {};
        }

        // Check if the unique visitor has expired
        if(stasisLocal.uniqueVisitorExpires !== undefined && stasisLocal.uniqueVisitorExpires < new Date().getTime()){
            stasisLocal.uniqueVisitorTracked = undefined;
            stasisLocal.uniqueVisitorExpires = undefined;
        }

        // Check if the unique visitor has already been tracked
        if (stasisLocal.uniqueVisitorTracked === undefined) {
            window.stasisData.push({ event: 'unique_visitor' });
            stasisLocal.uniqueVisitorTracked = true;
            stasisLocal.uniqueVisitorExpires = new Date().getTime() + 86400000; // 24 hours
        }

        // Save the local storage again
        localStorage.setItem('stasis', JSON.stringify(stasisLocal));
        
    },

    monitorDataLayer: function () {

        // Loop through the data layer and track each event
        for (var i = 0; i < window.stasisData.length; i++) {

            // Check if the event has already been sent
            if(Stasis.sent.includes(i)){
                continue;
            }

            // Add the event to the sent array
            Stasis.sent.push(i);

            // Not sent yet
            var event = window.stasisData[i];
            Stasis.track(event);

        }

        // Monitor the data layer every 1 second
       var interval = 200;

        setTimeout(Stasis.monitorDataLayer, interval);

    },

    track: function(payload) {
        
      if (!this.config.projectId) {
        console.error('Project ID not set. Please call Stasis.init(projectId) to set the project ID.');
        return;
      }

      if(Stasis.config.debug == true){
        console.log('track event', payload);
      }

      // Construct the URL based on the project ID
      var url = 'http://stasis.local/listen/' + this.config.projectId;
  
      var formData = new FormData();
      formData.append('event', payload.event);

      /*
      if (metric !== undefined && metric !== null) {
        formData.append('metric', metric);
      }
      */
  
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(new URLSearchParams(formData).toString());
  
      // Get the response from the server and detect anything not 201
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status !== 201) {
  
            // Is the xhr.responseText a JSON object?
            var errormessage = xhr.responseText;
            try {
              
              errormessage = JSON.parse(xhr.responseText).error;
  
            } catch (e) {
              
              // Use the response code as the error message
              if (xhr.status === 0) {
                errormessage = 'Connection refused';
              } else {
                errormessage = 'HTTP ' + xhr.status;
              }
  
            }
            
            console.error('Stasis Error: ' + errormessage);
            
          } else {
  
            if(Stasis.config.debug === true) {
              console.log(JSON.parse(xhr.responseText));
            }
  
          }
        }
      };
  
    }
  
  };
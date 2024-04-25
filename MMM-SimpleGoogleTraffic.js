/* Magic Mirror
 * Module: MMM-SimpleGoogleTraffic
 *
 * By huyphan (https://github.com/huyphan)
 * Forked and modifed from MMM-Traffic of saml-dev (https://github.com/saml-dev) 
 *
 * MIT Licensed.
 */

Module.register('MMM-SimpleGoogleTraffic', {
    defaults: {
        interval: 300000,
        showSymbol: true,
        firstLine: '{duration}',
        loadingText: 'Loading...',
        language: config.language,
        mode: 'driving',
        days: [0, 1, 2, 3, 4, 5, 6],
        hoursStart: '00:00',
        hoursEnd: '23:59'
    },

    getScripts: function() {
        return [
            'moment.js',
        ];
    },

    start: function() {
        console.log('Starting module: ' + this.name);
        this.service = undefined;
        this.loading = true;
        this.internalHidden = false;
        this.firstResume = true;
        this.errorMessage = undefined;
        this.errorDescription = undefined;
        this.updateCommute = this.updateCommute.bind(this);
        this.getDom = this.getDom.bind(this);
        if ([this.config.originCoords, this.config.destinationCoords, this.config.apiKey].includes(undefined)) {
            this.errorMessage = 'Config error';
            this.errorDescription = 'You must set originCoords, destinationCoords, and apiKey in your config';
            this.updateDom();
        }
    },

    updateCommute: function() {
        const self = this;

        if (!self.shouldHide()) {
            self.service.getDistanceMatrix({
                    origins: [self.config.originCoords],
                    destinations: [self.config.destinationCoords],
                    travelMode: 'DRIVING',
                    unitSystem: google.maps.UnitSystem.METRIC,
                    avoidHighways: true,
                    avoidTolls: true,
                },
                function(response, status) {
                    if (status === 'OK') {
                        self.durationText = response.rows[0].elements[0].duration.text;
                    } else {
                        self.errorMessage = 'Error fetching driving time';
                    }
                    self.loading = false;
                    self.updateDom();
                }
            );
        }

        setTimeout(this.updateCommute, this.config.interval);
    },

    getStyles: function() {
        return ['traffic.css', 'font-awesome.css'];
    },

    getDom: function() {
        const self = this;
        var wrapper = document.createElement("div");

        // hide when desired (called once on first update during hidden period)
        if (this.internalHidden) return wrapper;

        // base divs
        var firstLineDiv = document.createElement('div');
        firstLineDiv.className = 'bright medium mmmtraffic-firstline';
        var secondLineDiv = document.createElement('div');
        secondLineDiv.className = 'normal small mmmtraffic-secondline';

        // display any errors
        if (this.errorMessage) {
            firstLineDiv.innerHTML = this.errorMessage;
            secondLineDiv.innerHTML = this.errorDescription;
            wrapper.append(firstLineDiv);
            wrapper.append(secondLineDiv);
            return wrapper;
        }

        let symbolString = 'car';
        if (this.config.mode == 'cycling') symbolString = 'bicycle';
        if (this.config.mode == 'walking') symbolString = 'walking';

        // symbol
        if (this.config.showSymbol) {
            var symbol = document.createElement('span');
            symbol.className = `fa fa-${symbolString} symbol`;
            firstLineDiv.appendChild(symbol);
        }

        // first line
        var firstLineText = document.createElement('span');
        firstLineText.innerHTML = this.loading ? this.config.loadingText : this.replaceTokens(this.config.firstLine)
        firstLineDiv.appendChild(firstLineText);
        wrapper.appendChild(firstLineDiv);

        if (!this.loading) {
            // second line
            if (this.config.secondLine) {
                secondLineDiv.innerHTML = this.replaceTokens(this.config.secondLine);
                wrapper.appendChild(secondLineDiv);
            }
        }

        if (!self.service) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://maps.googleapis.com/maps/api/js?key=" + this.config.apiKey;
            script.setAttribute('defer', '');
            script.setAttribute('async', '');
            document.body.appendChild(script);

            script.onload = function() {
                self.service = new google.maps.DistanceMatrixService();
                self.updateCommute();
            };
        }

        return wrapper;
    },

    replaceTokens: function(text) {
        return text.replace(/{duration}/g, this.durationText);
    },

    shouldHide: function() {
        let hide = true;
        let now = moment();
        if (this.config.days.includes(now.day()) &&
            moment(this.config.hoursStart, 'HH:mm').isBefore(now) &&
            moment(this.config.hoursEnd, 'HH:mm').isAfter(now)
        ) {
            hide = false;
        }
        return hide;
    },
});

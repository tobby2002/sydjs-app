(function() {
	
	new View('about', {
		
		initialize: function() {
		
			//
		
		},
		
		on: {
			layout: function() {
				
				var availableHeight = app.viewportSize.height
					- this.$('.statusbar').height();
					- this.$('.footer').height();
					
				this.$('.container').css({
					height: availableHeight
				});
				
			},
			visible: function() {
				
				// Analytics
				// app.trackEvent( 'googleanalytics', 'Rewards', { category: 'view', action: 'visible' } );
				// app.trackEvent( 'mixpanel', 'Viewing Rewards', {} );
				
			}
		},
		
		buttons: {
			'.close': 'back',
			'.link': 'openLink'
		},
		
		back: function() {
			app.view('home').reveal('slide-up');
		},
		
		openLink: function(e) {
			window.open($(e.target).data().link, '_system');
		}
		
	});
	
})();

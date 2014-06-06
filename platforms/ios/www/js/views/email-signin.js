(function() {
	
	new View('email-signin', {
		
		on: {
			layout: function() {
				
				var availableHeight = app.viewportSize.height
					- this.$('.titlebar').height();
				
				// iOS: fixes the scrolling & rendering issue when previous/nexting through fields
				if (app._device.system == 'ios' && document.activeElement.tagName.toLowerCase().match(/input|textarea|select/))
					return;
				
				// cater for iOS 7 / desktop statusbar height
				if (!app._device.system || app._device.system == 'ios') {
					this.$('.titlebar').css('height', parseInt(this.$('.titlebar .wrap').css('height'), 10) + 21);
				}
				
				// set height and position of main container to availabe height
				this.$('.container').css({
					height: availableHeight,
					top: this.$('.titlebar').height()
				});
				
			},
			visible: function() {
				
				this.$('.signin').show();
				this.$('.signup').hide();
				
				// iOS: prevent auto focusing the last field
				app.disableFields();
				
				// Ensure form state is not set to processing when view is visible (shouldn't ever happen but left for safety)
				this._processingForm = false;
				
				// iOS: Change status bar style to match view style
				app.changeStatusBarStyle('black');
				
				// Analytics
				// app.trackEvent( 'googleanalytics', 'Enter Password', { category: 'view', action: 'visible' } );
				// app.trackEvent( 'mixpanel', 'Viewing Enter Password', {} );
				
				
			},
			hidden: function() {
				
				this.clearFields();
				
			}
		},
		
		buttons: {
			'.btn-right': 'previous',
			
			'.signin .action-submit': 'validateInput',
			'.signin .action-forgot-password': 'showForgotPassword',
			'.signin .action-signup': 'showSignup',
			
			'.signup .action-submit': 'validateInput',
			'.signup .action-signin': 'showSignin',
			
			'.signin .forgot-password': 'gotoForgotPassword'
		},
		
		previous: function() {
			app.view('signin').reveal('slide-down');
		},
		
		clearFields: function() {
		
			var self = this;
			
			_.each([ 'password' ], function(key) {
				self.field(key).val('');
			});
		
		},
		
		// Validate input and tokenise the card
		validateInput: function() {
		
			var self = this;
			
			if ( self._processingForm ) {
				$log('[validateInput] - User tried to submit form but is already in a processing state.');
				return;
			}
			
			self._processingForm = true;
			
			app.hideKeyboard();
			
			// Collect the form data
			var inputData = {
				username: this.field('username').val(),
				password: this.field('password').val()
			};
			
			// Log data
			$log("[validateInput] - Input data to be processed:", inputData);
			
			// Validate the form data
			if (!inputData.username.trim().length) {
				self._processingForm = false;
				app.showNotification('Alert', 'Please enter your username.');
				return;
			}
			 
			if (!inputData.password.trim().length) {
				self._processingForm = false;
				app.showNotification('Alert', 'Please enter your password.');
				return;
			}
			
			$log("[validateInput] - Input data passed all validation checks, saving data...");
			
			// Show loading spinner
			app.showLoadingSpinner();
			
			// Check password
			this.signinUser(inputData);
		
		},
		
		// Process the yser
		signinUser: function(data) {
		
			var self = this;
			
			var customerData = {
				username: data.username,
				password: data.password
			};
			
			$log("[signinUser] - User data to be processed:", customerData);
			
			$log("[signinUser] - Processing data...");
			
			console.log(customerData);
			
			$.ajax({
				url: config.baseURL + '/api/app/signin',
				type: 'POST',
				data: customerData,
				dataType: 'json',
				cache: false,
				success: function(rtnData) {
					
					if (rtnData.success && rtnData.session) {
					
						$log( "[signinUser] - Password check successful.", rtnData );
						
						// Put data in local storage
						app.storeSessionInfo(rtnData);
						
						// Hide loading spinner
						app.hideLoadingSpinner();
						
						// Set form to no longer processing
						self._processingForm = false;
						
						// Go to another view
						app.getStatus(function() {
							app.view('home').show('slide-up');
						});
					
					} else {
						
						$log( "[signinUser] - Password check failed, advise user to retry details.", rtnData );
						
						// Hide loading spinner
						app.hideLoadingSpinner();
						
						// Set form to no longer processing
						self._processingForm = false;
						
						// Reset and focus field
						self.field('password').val('');
						setTimeout(function() {
							self.field('password').focus();
						}, 100);
						
						// Show message
						app.showNotification('Alert', 'Sorry, we couldn\'t validate your password, please try again.');
					
					}
					
				},
				error: function(request, errType, err) {
					
					$log( "[signinUser] - Update failed, advise user to retry details." );
					
					// Hide loading spinner
					app.hideLoadingSpinner();
					
					// Set form to no longer processing
					self._processingForm = false;
					
					// Reset and focus field
					self.field('password').val('');
					setTimeout(function() {
						self.field('password').focus();
					}, 100);
					
					// Show message
					app.showNotification('Alert', 'Sorry, we couldn\'t validate your password, please try again.');
				
				}
			});
			
		},
		
		gotoForgotPassword: function() {
			window.open('http://www.contirewards.com.au/reset-password', '_system', 'location=no');
		}
		
	});

})();

// --- Extracted from /html/signup.html ---
// ===== Multi-tag Specialization =====
        let specActiveIndex = -1;
        let specTags = [];
        const fallbackSpecializations = [
            'Machine Learning',
            'Deep Learning',
            'Artificial Intelligence',
            'Neural Network',
            'Natural Language Processing',
            'Computer Vision',
            'Data Mining',
            'Big Data',
            'Cloud Computing',
            'Internet of Things',
            'Blockchain',
            'Cybersecurity',
            'Software Engineering',
            'Web Development',
            'Database Systems',
            'Algorithm Design'
        ];
        let specSuggestions = [...fallbackSpecializations];
        const specSuggestBox = document.getElementById('specSuggestions');

        document.getElementById('specInput').addEventListener('input', function() {
            const val = this.value.trim().toLowerCase();
            if (!val) { specSuggestBox.style.display = 'none'; return; }
            const matches = specSuggestions.filter(s => s.toLowerCase().includes(val) && !specTags.includes(s)).slice(0, 8);
            if (matches.length === 0) { specSuggestBox.style.display = 'none'; return; }
            specActiveIndex = 0;
            specSuggestBox.innerHTML = matches.map((m, i) =>
                `<div class="suggestion-item${i === 0 ? ' active' : ''}" onmousedown="selectSpecSuggestion('${m.replace(/'/g, "\\'")}')">${m}</div>`
            ).join('');
            specSuggestBox.style.display = 'block';
        });

        document.getElementById('specInput').addEventListener('blur', function() {
            setTimeout(() => { specSuggestBox.style.display = 'none'; }, 200);
        });

        function selectSpecSuggestion(val) {
            if (val && !specTags.includes(val)) {
                specTags.push(val);
                renderSpecTags();
            }
            document.getElementById('specInput').value = '';
            specSuggestBox.style.display = 'none';
        }

        function updateSpecSuggestHighlight(items) {
            items.forEach(el => el.classList.remove("active"));
            if (items[specActiveIndex]) items[specActiveIndex].classList.add("active");
        }

        function handleSpecKeydown(e) {
            const items = specSuggestBox.querySelectorAll(".suggestion-item");
            if (specSuggestBox.style.display === "block" && items.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (specActiveIndex < items.length - 1) specActiveIndex++;
                    updateSpecSuggestHighlight(items);
                    return;
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (specActiveIndex > 0) specActiveIndex--;
                    updateSpecSuggestHighlight(items);
                    return;
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (specActiveIndex >= 0 && specActiveIndex < items.length) {
                        const kw = items[specActiveIndex].innerText;
                        selectSpecSuggestion(kw);
                    }
                    return;
                }
            }
            const input = e.target;
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addSpecTag(input.value);
                input.value = '';
            } else if (e.key === 'Backspace' && input.value === '' && specTags.length > 0) {
                removeSpecTag(specTags.length - 1);
            }
        }

        function addSpecTag(val) {
            val = val.replace(/,/g, '').trim();
            if (!val || specTags.includes(val)) return;
            specTags.push(val);
            renderSpecTags();
        }

        function removeSpecTag(idx) {
            specTags.splice(idx, 1);
            renderSpecTags();
        }

        function renderSpecTags() {
            const container = document.getElementById('specTagsContainer');
            const input = document.getElementById('specInput');
            // Remove existing tags
            container.querySelectorAll('.spec-tag').forEach(t => t.remove());
            // Add tags before input
            specTags.forEach((tag, i) => {
                const el = document.createElement('span');
                el.className = 'spec-tag';
                el.innerHTML = tag + ' <span class="material-icons remove-tag" onclick="removeSpecTag(' + i + ')">close</span>';
                container.insertBefore(el, input);
            });
            // Update hidden field
            document.getElementById('specialization').value = specTags.join(', ');
            input.placeholder = specTags.length > 0 ? '' : 'Machine Learning';
        }

        // Also add tag when input loses focus (delayed to allow suggestion clicks)
        document.getElementById('specInput').addEventListener('blur', function() {
            const input = this;
            setTimeout(() => {
                if (input.value.trim()) {
                    addSpecTag(input.value);
                    input.value = '';
                }
            }, 250);
        });

        // AutoFill Email dynamically
        function autoFillEmail() {
            const role = document.getElementById('role').value;
            const studentIdVal = document.getElementById('studentId').value.trim().toLowerCase();
            const emailInput = document.getElementById('email');
            
            if (role === 'student') {
                if (studentIdVal.length > 0) {
                    emailInput.value = studentIdVal + '@mbstu.ac.bd';
                } else {
                    emailInput.value = '';
                }
            }
        }

        // Toggle role-specific fields
        function toggleRoleFields() {
            const role = document.getElementById('role').value;
            const studentFields = document.getElementById('studentFields');
            const teacherFields = document.getElementById('teacherFields');
            const degreeGroup = document.getElementById('degreeGroup');
            
            const studentIdField = document.getElementById('studentIdField');
            const emailField = document.getElementById('email');
            
            if (role === 'teacher') {
                studentFields.style.display = 'none';
                teacherFields.style.display = 'block';
                degreeGroup.style.display = 'none';
                studentIdField.style.display = 'none';
                document.getElementById('studentId').removeAttribute('required');
                
                emailField.removeAttribute('readonly'); 
                emailField.value = ''; // Let teacher type own email
                emailField.placeholder = "Enter your email@mbstu.ac.bd";
            } else {
                studentFields.style.display = 'block';
                teacherFields.style.display = 'none';
                degreeGroup.style.display = 'block';
                studentIdField.style.display = 'block';
                document.getElementById('studentId').setAttribute('required', '');
                
                emailField.setAttribute('readonly', 'true');
                autoFillEmail(); // Re-trigger autofill if they switch back to student
            }
        }

        // Toggle password visibility
        function togglePassword(inputId) {
            const passwordInput = document.getElementById(inputId);
            const toggleBtn = passwordInput.nextElementSibling;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = 'visibility_off';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = 'visibility';
            }
        }

        // Password strength checker
        document.getElementById('password').addEventListener('input', function() {
            const password = this.value;
            const strengthBars = [
                document.getElementById('strengthBar1'),
                document.getElementById('strengthBar2'),
                document.getElementById('strengthBar3'),
                document.getElementById('strengthBar4')
            ];
            const strengthText = document.getElementById('strengthText');
            
            // Reset bars
            strengthBars.forEach(bar => bar.className = 'strength-bar');
            strengthText.className = 'strength-text';
            
            if (password.length === 0) {
                strengthText.textContent = 'Password strength';
                return;
            }
            
            let strength = 0;
            
            // Length check
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            
            // Contains number
            if (/\d/.test(password)) strength++;
            
            // Contains special character
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
            
            // Contains uppercase and lowercase
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            
            // Apply strength visualization
            if (strength <= 2) {
                strengthBars[0].classList.add('weak');
                strengthText.textContent = 'Weak password';
                strengthText.classList.add('weak');
            } else if (strength <= 3) {
                strengthBars[0].classList.add('medium');
                strengthBars[1].classList.add('medium');
                strengthText.textContent = 'Medium password';
                strengthText.classList.add('medium');
            } else if (strength <= 4) {
                strengthBars[0].classList.add('strong');
                strengthBars[1].classList.add('strong');
                strengthBars[2].classList.add('strong');
                strengthText.textContent = 'Strong password';
                strengthText.classList.add('strong');
            } else {
                strengthBars.forEach(bar => bar.classList.add('strong'));
                strengthText.textContent = 'Very strong password';
                strengthText.classList.add('strong');
            }
        });

        // Show error message
        function showError(message) {
            const errorMessage = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            const successMessage = document.getElementById('successMessage');
            
            successMessage.classList.remove('show');
            errorText.textContent = message;
            errorMessage.classList.add('show');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Show success message
        function showSuccess(message) {
            const successMessage = document.getElementById('successMessage');
            const successText = document.getElementById('successText');
            const errorMessage = document.getElementById('errorMessage');
            
            errorMessage.classList.remove('show');
            successText.textContent = message;
            successMessage.classList.add('show');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Show email domain hint when user types a non-matching email
        document.getElementById('email').addEventListener('input', function() {
            const hint = document.getElementById('emailHint');
            const val = this.value.trim();
            hint.style.display = (val.length > 0 && !val.endsWith('@mbstu.ac.bd')) ? 'block' : 'none';
        });

        // Form submission handler
        document.getElementById('signupForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const role = document.getElementById('role').value;
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const department = document.getElementById('department').value;
            const terms = document.getElementById('terms').checked;
            
            // Validation
            if (role === 'student') {
                const sIdInput = document.getElementById('studentId').value.trim();
                const alphanumericRegex = /^[a-zA-Z0-9]+$/;
                if (sIdInput.length !== 7 || !alphanumericRegex.test(sIdInput)) {
                    showError('Student ID must be exactly 7 alphanumeric characters long');
                    return;
                }
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address');
                return;
            }

            if (!email.endsWith('@mbstu.ac.bd')) {
                showError('Email must end with @mbstu.ac.bd');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            if (!terms) {
                showError('Please accept the Terms of Service and Privacy Policy');
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
            
            try {
                let userCredential;
                try {
                    // 1. Create User in Firebase FIRST!
                    userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                } catch (authError) {
                    if (authError.code === 'auth/email-already-in-use') {
                        // The user might have been partially created due to a previous crash.
                        // Let's try to sign in to salvage the Firebase account for backend registration.
                        try {
                            userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                        } catch (signInErr) {
                            // If sign in fails, the email is genuinely taken, or wrong password
                            throw new Error("This email is already registered. If your previous signup crashed halfway, please use the exact same password you tried earlier, or use the 'Forgot Password' directly on the Login page to reset your orphaned account before attempting to sign up again.");
                        }
                    } else {
                        throw authError;
                    }
                }
                
                // 2. Immediately send the verification email
                if (!userCredential.user.emailVerified) {
                    await userCredential.user.sendEmailVerification();
                }
                
                const firebaseUid = userCredential.user.uid;
                
                let result;
                
                if (role === 'student') {
                    const studentId = document.getElementById('studentId').value.trim().toUpperCase();
                    const degreeType = document.getElementById('degreeType').value;
                    
                    if (!studentId) {
                        showError('Student ID is required');
                        submitBtn.textContent = 'Create Account';
                        submitBtn.disabled = false;
                        // Cleanup if they failed front-end validation after Firebase created them
                        await userCredential.user.delete(); 
                        return;
                    }
                    
                    const studentData = {
                        firstName,
                        lastName,
                        email,
                        password, // Backend still needs this temporarily for legacy DB code
                        firebaseUid,   // <--- We pass the Firebase UID to the Java backend!
                        studentId,
                        department,
                        degreeType,
                        session: document.getElementById('session').value
                    };
                    result = await TPRSApi.registerStudent(studentData);
                    
                } else {
                    // Teacher / Supervisor
                    const designation = document.getElementById('designation').value;
                    const specialization = document.getElementById('specialization').value.trim();
                    
                    const teacherData = {
                        firstName,
                        lastName,
                        email,
                        password, // Backend still needs this temporarily for legacy DB code
                        firebaseUid,   // <--- We pass the Firebase UID to the Java backend!
                        department,
                        designation,
                        specialization
                    };
                    result = await TPRSApi.registerTeacher(teacherData);
                }
                
                if (result.success) {
                    showSuccess('Account created successfully! Please check your email inbox (and spam folder) to verify your address before logging in. Redirecting...');
                    submitBtn.textContent = 'Account Created!';
                    
                    // Firebase manages the session instantly. We sign them out so they must login after verification
                    await firebase.auth().signOut();
                    
                    setTimeout(() => {
                        window.location.href = '/html/login.html';
                    }, 5000);
                } else {
                    showError(result.message || 'Registration failed. Please try again.');
                    // If backend failed, cleanup the firebase user
                    await userCredential.user.delete();
                    submitBtn.textContent = 'Create Account';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Registration Error:', error);
                
                let errorMessage = 'An error occurred during registration.';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'This email address is already registered.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'The email address is not valid.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'The password is too weak.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showError(errorMessage);
                submitBtn.textContent = 'Create Account';
                submitBtn.disabled = false;
                return;
            }
        });

        // Check if already logged in
        if (TPRSApi.isLoggedIn()) {
            window.location.href = '/html/home.html';
        }

        async function initPage() {
            // Load settings
            const settings = await TPRSApi.getSettings();
            
            // Populate Departments
            const deptSelect = document.getElementById('department');
            if (settings.departments) {
                settings.departments.forEach(dept => {
                    const opt = document.createElement('option');
                    opt.value = dept.id;
                    opt.textContent = dept.name;
                    deptSelect.appendChild(opt);
                });
            }

            // Populate Degree Types
            const degreeSelect = document.getElementById('degreeType');
            if (settings.degreeTypes) {
                settings.degreeTypes.forEach(deg => {
                    const opt = document.createElement('option');
                    opt.value = deg.id;
                    opt.textContent = deg.name;
                    degreeSelect.appendChild(opt);
                });
            }

            // Populate Sessions
            const sessionSelect = document.getElementById('session');
            if (settings.sessions) {
                settings.sessions.forEach(sess => {
                    const opt = document.createElement('option');
                    opt.value = sess;
                    opt.textContent = sess;
                    sessionSelect.appendChild(opt);
                });
            }

            // Set Specialization Suggestions
            if (settings && Array.isArray(settings.specializations) && settings.specializations.length > 0) {
                specSuggestions = settings.specializations;
            } else {
                specSuggestions = [...fallbackSpecializations];
            }

            // Initialize UI
            if (typeof toggleRoleFields === 'function') {
                toggleRoleFields();
            }
        }
        
        // Run initialized tasks when DOM loads
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                await initPage();
            } catch (e) {
                console.error('Signup init failed, using fallback specializations', e);
                specSuggestions = [...fallbackSpecializations];
            }
        });

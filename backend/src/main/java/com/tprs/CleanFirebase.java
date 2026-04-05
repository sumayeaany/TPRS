package com.tprs;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.ListUsersPage;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.auth.oauth2.GoogleCredentials;

public class CleanFirebase {
    public static void main(String[] args) throws Exception {
        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(GoogleCredentials.getApplicationDefault())
            .setProjectId("project-d7c9c146-bcce-427e-a85")
            .build();
        FirebaseApp.initializeApp(options);
        
        ListUsersPage page = FirebaseAuth.getInstance().listUsers(null);
        for (UserRecord user : page.getValues()) {
            if (user.getEmail() != null && !user.getEmail().equals("admin@tprs.com")) {
               FirebaseAuth.getInstance().deleteUser(user.getUid());
               System.out.println("Deleted: " + user.getEmail());
            }
        }
    }
}

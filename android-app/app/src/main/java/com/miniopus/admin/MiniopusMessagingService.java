package com.miniopus.admin;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MiniopusMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "miniopus_orders";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = message.getNotification() != null
                ? message.getNotification().getTitle() : "Miniopus";
        String body = message.getNotification() != null
                ? message.getNotification().getBody() : "You have a new update.";

        NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(
                    CHANNEL_ID, "Miniopus order alerts",
                    NotificationManager.IMPORTANCE_HIGH));
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notification =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_info)
                        .setContentTitle(title == null ? "Miniopus" : title)
                        .setContentText(body == null ? "New order update" : body)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pending);

        manager.notify((int) System.currentTimeMillis(), notification.build());
    }
}

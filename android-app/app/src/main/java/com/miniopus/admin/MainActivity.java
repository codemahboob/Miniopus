package com.miniopus.admin;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout root;
    private TextView tokenView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        TextView heading = new TextView(this);
        heading.setText("Miniopus — Firebase setup");
        heading.setTextSize(20);
        heading.setPadding(16, 16, 16, 8);
        root.addView(heading);

        tokenView = new TextView(this);
        tokenView.setText("Getting Firebase token…");
        tokenView.setTextIsSelectable(true);
        tokenView.setPadding(16, 12, 16, 12);
        root.addView(tokenView);

        Button copyButton = new Button(this);
        copyButton.setText("Copy Firebase token");
        root.addView(copyButton);

        Button openAdmin = new Button(this);
        openAdmin.setText("Open Miniopus Admin");
        root.addView(openAdmin);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                return host == null || !host.equals("miniopus.vercel.app");
            }
        });

        openAdmin.setOnClickListener(v -> {
            root.removeView(webView);
            root.addView(webView, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
            webView.loadUrl("https://miniopus.vercel.app/admin.html");
        });

        copyButton.setOnClickListener(v -> {
            String token = tokenView.getText().toString();
            if (token.startsWith("Getting") || token.startsWith("Token unavailable")) {
                Toast.makeText(this, "Token is not ready yet", Toast.LENGTH_SHORT).show();
                return;
            }
            ClipboardManager clipboard =
                    (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("FCM token", token));
            Toast.makeText(this, "Token copied", Toast.LENGTH_SHORT).show();
        });

        setContentView(root);

        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        tokenView.setText(task.getResult());
                    } else {
                        tokenView.setText("Token unavailable: " +
                                (task.getException() == null
                                        ? "unknown error"
                                        : task.getException().getMessage()));
                    }
                });
    }
}

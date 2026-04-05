package com.paiagent.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.nio.file.Path;

@Service
@Slf4j
public class MinioStorageService {

    private final String endpoint;
    private final String accessKey;
    private final String secretKey;
    private final String bucket;
    private final int expirySeconds;

    public MinioStorageService(
            @Value("${paiagent.storage.minio.endpoint:}") String endpoint,
            @Value("${paiagent.storage.minio.access-key:}") String accessKey,
            @Value("${paiagent.storage.minio.secret-key:}") String secretKey,
            @Value("${paiagent.storage.minio.bucket:paiagent-audio}") String bucket,
            @Value("${paiagent.storage.minio.url-expiry-seconds:86400}") int expirySeconds) {
        this.endpoint = endpoint;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.bucket = bucket;
        this.expirySeconds = expirySeconds;
    }

    public String uploadFile(Path file, String objectName, String contentType) {
        MinioClient minioClient = createClient();
        ensureBucket();
        try (FileInputStream inputStream = new FileInputStream(file.toFile())) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, file.toFile().length(), -1)
                            .contentType(contentType)
                            .build()
            );
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(objectName)
                            .expiry(expirySeconds)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO: " + objectName, e);
        }
    }

    private MinioClient createClient() {
        if (endpoint.isBlank() || accessKey.isBlank() || secretKey.isBlank()) {
            throw new IllegalStateException("MinIO configuration is incomplete");
        }
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    private void ensureBucket() {
        MinioClient minioClient = createClient();
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket '{}'", bucket);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize MinIO bucket: " + bucket, e);
        }
    }
}

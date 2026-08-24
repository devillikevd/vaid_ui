package com.example.swastik.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ReferralAttachmentDto(
    @SerializedName("document_type") val documentType: String,
    @SerializedName("file_name") val fileName: String
)

data class ReferralConsentDto(
    @SerializedName("id") val id: String,
    @SerializedName("sender_snapshot_name") val senderName: String,
    @SerializedName("receiver_snapshot_name") val receiverName: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("urgency") val urgency: String,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("attachments") val attachments: List<ReferralAttachmentDto> = emptyList()
)

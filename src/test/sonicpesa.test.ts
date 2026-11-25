import { describe, expect, it } from "vitest";
import {
  sonicAuthRejected,
  sonicErrorMessage,
  sonicOrderId,
  sonicPaymentStatus,
  sonicPesaRequest,
} from "@/lib/sonicpesa";

const config = {
  api_key: "test-api-key",
  api_secret: "test-api-secret",
  base_url: "https://api.sonicpesa.com/api/v1/",
  enabled: true,
};

describe("SonicPesa payment requests", () => {
  it("creates a Push USSD order with both credentials in server request headers", () => {
    const request = sonicPesaRequest(config, "/payment/create_order", {
      buyer_email: "customer@example.com",
      buyer_name: "Amina Juma",
      buyer_phone: "255765902345",
      amount: 2000,
      currency: "TZS",
    });

    expect(request.url).toBe("https://api.sonicpesa.com/api/v1/payment/create_order");
    expect(request.init.method).toBe("POST");
    expect(request.init.redirect).toBe("manual");
    expect(request.init.headers).toMatchObject({
      "X-API-KEY": "test-api-key",
      "X-API-SECRET": "test-api-secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      buyer_phone: "255765902345",
      amount: 2000,
      currency: "TZS",
    });
  });

  it("reads the order id and pending state returned by SonicPesa", () => {
    const response = {
      status: "success",
      data: { order_id: "sp_example", payment_status: "PENDING" },
    };
    expect(sonicOrderId(response)).toBe("sp_example");
    expect(sonicPaymentStatus(response)).toBe("PENDING");
  });

  it("accepts a nested order id and normalizes payment status", () => {
    const response = { data: { order_status_data: { order_id: "sp_nested" }, status: "success" } };
    expect(sonicOrderId(response)).toBe("sp_nested");
    expect(sonicPaymentStatus(response)).toBe("SUCCESS");
  });

  it("rejects invalid credentials even when the provider uses HTTP 400", () => {
    expect(sonicAuthRejected(400, { message: "Invalid API key" })).toBe(true);
    expect(sonicAuthRejected(404, { message: "Order not found" })).toBe(false);
  });

  it("turns rejected credentials into a safe admin instruction", () => {
    const message = sonicErrorMessage(401, { message: "Invalid API key" });
    expect(message).toContain("Unganisha Malipo");
    expect(message).not.toContain(config.api_key);
    expect(message).not.toContain(config.api_secret);
  });
});

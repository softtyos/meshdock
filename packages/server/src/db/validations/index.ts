import { z } from "zod";

export const sshKeyCreate = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	publicKey: z.string().refine(
		(key) => {
			const cleanKey = (key || "").trim();
			const rsaPubPattern = /^ssh-rsa\s+([A-Za-z0-9+/=]+)\s*(.*)?\s*$/;
			const ed25519PubPattern = /^ssh-ed25519\s+([A-Za-z0-9+/=]+)\s*(.*)?\s*$/;
			const ecdsaPubPattern = /^ecdsa-sha2-nistp\d+\s+([A-Za-z0-9+/=]+)\s*(.*)?\s*$/;
			return (
				rsaPubPattern.test(cleanKey) ||
				ed25519PubPattern.test(cleanKey) ||
				ecdsaPubPattern.test(cleanKey)
			);
		},
		{
			message: "Invalid public key format",
		},
	),
	privateKey: z.string().refine(
		(key) => {
			const normalized = (key || "").replace(/\r\n/g, "\n").trim();
			const rsaPrivPattern =
				/^-----BEGIN RSA PRIVATE KEY-----\n([\s\S]+?)\n-----END RSA PRIVATE KEY-----$/;
			const openSshPrivPattern =
				/^-----BEGIN OPENSSH PRIVATE KEY-----\n([\s\S]+?)\n-----END OPENSSH PRIVATE KEY-----$/;
			const pkcs8PrivPattern =
				/^-----BEGIN (?:ENCRYPTED )?PRIVATE KEY-----\n([\s\S]+?)\n-----END (?:ENCRYPTED )?PRIVATE KEY-----$/;
			const ecPrivPattern =
				/^-----BEGIN EC PRIVATE KEY-----\n([\s\S]+?)\n-----END EC PRIVATE KEY-----$/;
			return (
				rsaPrivPattern.test(normalized) ||
				openSshPrivPattern.test(normalized) ||
				pkcs8PrivPattern.test(normalized) ||
				ecPrivPattern.test(normalized)
			);
		},
		{
			message: "Invalid private key format",
		},
	),
});

export const sshKeyUpdate = sshKeyCreate.pick({
	name: true,
	description: true,
});

export const sshKeyType = z.object({
	type: z.enum(["rsa", "ed25519"]).optional(),
});

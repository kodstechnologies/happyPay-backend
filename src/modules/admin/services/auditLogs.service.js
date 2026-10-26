import AdminAuditLog from "../models/adminAuditLog.model.js";

const createAuditLog = async ({
    action,
    entity,
    entityId,
    description,
    admin,
    ipAddress,
    userAgent,
}) => {
    try {
        if (!admin?._id || !admin?.name || !admin?.role) {
            throw new Error("Valid admin details are required for audit logging");
        }

        const auditLog = await AdminAuditLog.create({
            action,
            entity,
            entityId,
            description,
            userName: admin.name,
            role: admin.role,
            createdBy: {
                adminId: admin._id,
                name: admin.name,
                role: admin.role,
            },
            updatedBy: {
                adminId: admin._id,
                name: admin.name,
                role: admin.role,
            },
            ipAddress,
            userAgent,
        });

        return auditLog;
    } catch (error) {
        throw error;
    }
};

export default createAuditLog;
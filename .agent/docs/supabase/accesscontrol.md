# Supabase Access Control Documentation

Supabase provides granular access controls to manage permissions across your organizations and projects.

## Roles

For each organization and project, a member can have one of the following roles:

- **Owner**: Full access to everything in organization and project resources.
- **Administrator**: Full access except updating organization settings, transferring projects outside the organization, and adding new owners.
- **Developer**: Read-only access to organization resources; can access project content but not change project settings.
- **Read-Only**: Read-only access to organization and project resources. (Only available on Team and Enterprise plans.)

When you first create an account, a default organization is created and you'll be assigned as the **Owner**. Any organizations you create will assign you as **Owner** as well.

---
# Supabase Access Control: Permissions Matrix

## Organization Permissions Across Roles

| Resource                       | Action                                    | Owner | Administrator | Developer | Read-Only |
|--------------------------------|-------------------------------------------|-------|---------------|-----------|-----------|
| **Organization Management**    | Update                                    | ✅    | ❌            | ❌        | ❌        |
|                                | Delete                                    | ✅    | ❌            | ❌        | ❌        |
|                                | OpenAI Telemetry Configuration            | ✅    | ✅            | ❌        | ❌        |
| **Members**                    | Organization Members - List               | ✅    | ✅            | ✅        | ✅        |
|                                | Owner - Add/Remove                        | ✅    | ❌            | ❌        | ❌        |
|                                | Administrator - Add/Remove                | ✅    | ✅            | ❌        | ❌        |
|                                | Developer - Add/Remove                    | ✅    | ✅            | ✅        | ❌        |
|                                | Owner (Project-Scoped) - Add/Remove       | ✅    | ✅            | ✅        | ❌        |
|                                | Administrator (Project-Scoped) - Add/Remove| ✅    | ✅            | ✅        | ❌        |
|                                | Developer (Project-Scoped) - Add/Remove   | ✅    | ✅            | ✅        | ❌        |
|                                | Invite / Revoke / Resend                  | ✅    | ✅            | ✅        | ❌        |
|                                | Accept                                    | ✅    | ✅            | ✅        | ❌        |
| **Billing**                    | Invoices - List                           | ✅    | ✅            | ✅        | ✅        |
|                                | Billing Email - View/Update               | ✅    | ✅            | ✅        | ❌        |
|                                | Subscription - View/Update                | ✅    | ✅            | ✅        | ❌        |
|                                | Billing Address - View/Update             | ✅    | ✅            | ✅        | ❌        |
|                                | Tax Codes - View/Update                   | ✅    | ✅            | ✅        | ❌        |
|                                | Payment Methods - View/Update             | ✅    | ✅            | ✅        | ❌        |
|                                | Usage - View                              | ✅    | ✅            | ✅        | ✅        |
| **Integrations (Org Settings)**| GitHub Connections (Create/Update/Delete/View) | ✅ | ✅ | ❌ | ❌ |
|                                | Vercel Connections (Create/Update/Delete/View)| ✅ | ✅ | ❌ | ❌ |
| **OAuth Apps**                 | Create/Update/Delete/List                 | ✅    | ✅            | ❌        | ❌        |
| **Audit Logs**                 | View Audit logs                           | ✅    | ✅            | ✅        | ✅        |
| **Legal Documents**            | SOC2 Type 2 Report - Download             | ✅    | ✅            | ✅        | ✅        |
|                                | Security Questionnaire - Download         | ✅    | ✅            | ✅        | ✅        |

---

## Project Permissions Across Roles

| Resource                       | Action                                    | Owner | Admin | Developer | Read-Only |
|--------------------------------|-------------------------------------------|-------|-------|-----------|-----------|
| **Project Management**         | Transfer/Create/Delete/Update/Pause/Restore/Restart | ✅ | ✅ | ❌ | ❌ |
| **Custom Domains**             | View/Update                               | ✅    | ✅    | ❌        | ❌        |
| **Data (Database)**            | View/Manage                               | ✅    | ✅    | ✅        | ✅        |
| **Infrastructure**             | Read Replicas (List/Create/Delete)        | ✅    | ✅    | ❌        | ❌        |
|                                | Add-ons - Update                          | ✅    | ✅    | ❌        | ❌        |
| **Integrations**               | GitHub/Vercel Connections (Create/Update/Delete/View)| ✅ | ✅ | ❌ | ❌ |
| **Database Config**            | Pooling/SSL/Disk/Network Restrictions     | ✅    | ✅    | ✅        | ❌        |
| **API Config**                 | API Keys/JWT/View/Generate/Update         | ✅    | ✅    | ✅        | ❌        |
| **Auth Config**                | View/Update SMTP/Advanced settings        | ✅    | ✅    | ✅        | ❌        |
| **Storage Config**             | Upload Limit/S3 Access Keys/View/Create/Delete | ✅ | ✅ | ✅ | ❌ |
| **Edge Functions Config**      | Secrets - View/Create/Delete              | ✅    | ✅    | ✅        | ✅        |
| **SQL Editor**                 | Queries - Create/Update/Delete/View/List/Run | ✅ | ✅ | ✅ | ✅ |
| **Database**                   | Backups - View/Download/Restore           | ✅    | ✅    | ✅        | ✅        |
|                                | Physical backups (PITR) - View/Restore    | ✅    | ✅    | ✅        | ✅        |
| **Authentication**             | Users - Create/Delete/List/Send OTP/Recovery/Magic | ✅ | ✅ | ✅ | ❌ |
|                                | Providers/Rate Limits/Email Templates/URL/Hooks | ✅ | ✅ | ✅ | ❌ |
| **Storage**                    | Buckets - Create/Update/Delete/View/List  | ✅    | ✅    | ✅        | ❌        |
|                                | Files - Create/Update/Delete/List         | ✅    | ✅    | ✅        | ❌        |
| **Edge Functions**             | Update/Delete/View/List                   | ✅    | ✅    | ✅        | ✅        |
| **Reports**                    | Create/Update/Delete/View/List            | ✅    | ✅    | ✅        | ✅        |
| **Logs & Analytics**           | Queries - Create/Update/Delete/View/List/Run | ✅ | ✅ | ✅ | ✅ |
| **Branching**                  | Production Branch - Read/Write            | ✅    | ✅    | ❌        | ❌        |
|                                | Development Branches - List/Create/Update/Delete | ✅ | ✅ | ❌ | ❌ |

---

## Footnotes

- Read-Only and project-scoped roles are available on Team/Enterprise Plans.
- Some actions (like OpenAI Telemetry and SSO restrictions) have special notes.
- The SQL Editor's Read-Only role is tied to the `supabase_read_only_user` Postgres role (`pg_read_all_data`).


## Manage Organization Members

To invite others to collaborate:

1. Visit your organization's team settings to send an invite link to another user's email.
2. The invite is valid for 24 hours.
3. For project scoped roles, you can only assign a role to a single project during the invite. You can assign additional project roles after acceptance.

Invites sent from a SAML SSO account can only be accepted by another SAML SSO account from the same identity provider. This is a security measure to prevent accidental invites to accounts not managed by your enterprise's identity provider.

---

## Management API: Viewing Organization Members

You can also view organization members using the Management API.


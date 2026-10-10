# Resident issue workflow

## Account setup

Use separate verified resident, auditor, and contractor accounts. In the admin portal, give the auditor and contractor their actual department. Assign the auditor an open project in that department. Auditors cannot change account roles or departments; those remain administrative actions.

## Test the flow

1. Sign in as a resident. Open `/report`, select a published project, describe the issue, and optionally upload a real evidence photo. Confirm the coordinates, edit them if the issue is elsewhere, or use the current-location button. Submit and keep the reference number.
2. Open `/projects` in a separate public browser session. Locate the orange issue marker and open its popup. Check the reference and status. Public readers receive redacted details and no reporter contact information.
3. Sign in as the auditor assigned to the related project. The resident issue, coordinates, and evidence should appear in **Resident issues**. Choose the project and a verified contractor from the same department. Optionally select the issue when dispatching; this acknowledges a submitted issue and links an unlinked issue atomically.
4. Sign in as that contractor. Their assigned project and linked issues should appear. Submit progress or completion evidence using the existing work submission form.
5. Sign in as the assigned auditor. Review the submission, request corrections or approve it. Approved completion marks the project completed. Grievance resolution remains a separate officer action; completing a project does not automatically close every resident complaint.
6. Track the issue using its reference in `/reports/track`. The officer can investigate or resolve the grievance through the existing reports view.

Workspace and map views refresh on window focus and every 30 seconds. Existing contractor assignments are retained when another contractor is added. Unlinked issues appear in an auditor's redacted intake queue once that auditor has an assigned project; linking exposes the details only to staff assigned to that project. An issue without a stored location cannot have an accurate map marker.

## Access checks

- A resident or contractor cannot call auditor dispatch.
- An auditor cannot dispatch a project they are not assigned to.
- A contractor from another department cannot be assigned.
- An issue already linked to another project cannot be moved through dispatch.
- Resolved issues and closed projects cannot be dispatched.
- Repeat dispatch does not create duplicate assignments.
- Revoking an assignment removes its project and issues from that user's workspace.

## Verification performed

Automated service tests cover dispatch permission checks, backend failures, workspace mapping, coordinate preservation, and public-key classification. Live database checks ran inside a rollback-only transaction and covered role and department restrictions, issue linking, acknowledgement, idempotency, resolved-issue rejection, and public redaction. The production build is checked separately. A complete Google sign-in walkthrough with three real role accounts still needs to be run by the site owner.

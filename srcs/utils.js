async function getUserPrefs(client, userId) {
	const res = await client.users.info({ user: userId, include_locale: true });
	return {
		tz: res.user.tz || 'UTC',
		locale: res.user.locale || 'en-US',
		displayName: res.user.profile?.display_name
			|| res.user.profile?.real_name
			|| res.user.name
			|| userId,
	};
}

module.exports = { getUserPrefs };

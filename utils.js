// 공용 유틸 함수
function msToTime(duration) {
  const sec = Math.floor((duration / 1000) % 60);
  const min = Math.floor((duration / (1000 * 60)) % 60);
  const hrs = Math.floor(duration / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

// 명령 실행자가 봇과 같은 음성 채널에 있는지 확인.
// 문제 없으면 null, 문제 있으면 사용자에게 보여줄 메시지를 반환.
function checkVoice(interaction, player) {
  const memberChannel = interaction.member?.voice?.channel;
  if (!memberChannel) return "먼저 음성 채널에 들어가 주세요.";
  if (player && player.voiceChannelId && player.voiceChannelId !== memberChannel.id)
    return "봇과 같은 음성 채널에 있어야 사용할 수 있어요.";
  return null;
}

module.exports = { msToTime, checkVoice };

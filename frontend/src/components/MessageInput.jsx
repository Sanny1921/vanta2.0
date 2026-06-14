import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import '../css/MessageInput.css';

// Curated list of popular emojis with tags for search indexing
const EMOJI_DATA = [
  // Smileys & Emotion
  { emoji: '😀', name: 'grinning face happy smile', category: 'Smileys' },
  { emoji: '😃', name: 'grinning face big eyes happy smile', category: 'Smileys' },
  { emoji: '😄', name: 'grinning face smiling eyes happy smile laugh', category: 'Smileys' },
  { emoji: '😁', name: 'beaming face smiling eyes happy smile grin', category: 'Smileys' },
  { emoji: '😆', name: 'grinning squinting face happy smile laugh', category: 'Smileys' },
  { emoji: '😅', name: 'grinning face sweat happy smile laugh cold', category: 'Smileys' },
  { emoji: '😂', name: 'face with tears of joy lol haha laugh happy', category: 'Smileys' },
  { emoji: '🤣', name: 'rolling on the floor laughing rofl lol haha laugh', category: 'Smileys' },
  { emoji: '😊', name: 'smiling face smiling eyes happy smile blush', category: 'Smileys' },
  { emoji: '😇', name: 'smiling face with halo angel innocent', category: 'Smileys' },
  { emoji: '🙂', name: 'slightly smiling face happy smile', category: 'Smileys' },
  { emoji: '🙃', name: 'upside down face silly sarcasm', category: 'Smileys' },
  { emoji: '😉', name: 'winking face wink', category: 'Smileys' },
  { emoji: '😌', name: 'relieved face relieved calm', category: 'Smileys' },
  { emoji: '😍', name: 'smiling face with heart eyes love heart crush', category: 'Smileys' },
  { emoji: '🥰', name: 'smiling face with hearts love heart crush happy', category: 'Smileys' },
  { emoji: '😘', name: 'face blowing a kiss kiss love heart', category: 'Smileys' },
  { emoji: '😋', name: 'face savoring food delicious tasty yum', category: 'Smileys' },
  { emoji: '😛', name: 'face with tongue silly', category: 'Smileys' },
  { emoji: '😜', name: 'winking face with tongue silly wink', category: 'Smileys' },
  { emoji: '🤪', name: 'zany face crazy silly', category: 'Smileys' },
  { emoji: '🤨', name: 'face with raised eyebrow suspicious', category: 'Smileys' },
  { emoji: '🧐', name: 'face with monocle investigator curious', category: 'Smileys' },
  { emoji: '🤓', name: 'nerd face geek smart bookworm', category: 'Smileys' },
  { emoji: '😎', name: 'smiling face with sunglasses cool awesome style', category: 'Smileys' },
  { emoji: '🥳', name: 'partying face party celebrate birthday', category: 'Smileys' },
  { emoji: '😏', name: 'smirking face smirk sarcasm', category: 'Smileys' },
  { emoji: '😒', name: 'unamused face annoyed bored', category: 'Smileys' },
  { emoji: '😞', name: 'disappointed face sad sorry', category: 'Smileys' },
  { emoji: '😔', name: 'pensive face sad depressed', category: 'Smileys' },
  { emoji: '😟', name: 'worried face worry anxious', category: 'Smileys' },
  { emoji: '😕', name: 'confused face confuse puzzle', category: 'Smileys' },
  { emoji: '☹️', name: 'frowning face sad', category: 'Smileys' },
  { emoji: '🥺', name: 'pleading face please beg puppy eyes sad', category: 'Smileys' },
  { emoji: '😢', name: 'crying face cry sad tears', category: 'Smileys' },
  { emoji: '😭', name: 'loudly crying face cry sob sad tears loud', category: 'Smileys' },
  { emoji: '😤', name: 'face with steam from nose angry mad', category: 'Smileys' },
  { emoji: '😠', name: 'angry face mad rage', category: 'Smileys' },
  { emoji: '😡', name: 'pouting face angry mad rage red', category: 'Smileys' },
  { emoji: '🤬', name: 'face with symbols on mouth swear cuss angry', category: 'Smileys' },
  { emoji: '🤯', name: 'exploding head mindblown wow surprise', category: 'Smileys' },
  { emoji: '😳', name: 'flushed face embarrassed surprise wide eyes', category: 'Smileys' },
  { emoji: '🥵', name: 'hot face heat sun summer red sweating', category: 'Smileys' },
  { emoji: '🥶', name: 'cold face freeze winter ice blue shivering', category: 'Smileys' },
  { emoji: '😱', name: 'face screaming in fear scared terrified shock scream', category: 'Smileys' },
  { emoji: '🤔', name: 'thinking face think wonder guess', category: 'Smileys' },
  { emoji: '🤫', name: 'shushing face quiet silence whisper secret', category: 'Smileys' },
  { emoji: '🫠', name: 'melting face melt hot warm sarcasm', category: 'Smileys' },
  { emoji: '😶', name: 'face without mouth silence quiet', category: 'Smileys' },
  { emoji: '😐', name: 'neutral face meh indifferent', category: 'Smileys' },
  { emoji: '😑', name: 'expressionless face meh flat line', category: 'Smileys' },
  { emoji: '😬', name: 'grimacing face oops awkward cringe', category: 'Smileys' },
  { emoji: '🙄', name: 'face with rolling eyes roll eyes annoyed bored', category: 'Smileys' },
  { emoji: '😴', name: 'sleeping face sleep tired bed zzz snore', category: 'Smileys' },
  { emoji: '🥱', name: 'yawning face yawn tired sleep', category: 'Smileys' },
  { emoji: '🤮', name: 'face vomiting sick puke throw up green', category: 'Smileys' },
  { emoji: '🤢', name: 'nauseated face sick green disgust', category: 'Smileys' },
  { emoji: '😷', name: 'face with medical mask sick doctor health', category: 'Smileys' },
  { emoji: '😈', name: 'smiling face with horns devil evil mischievous', category: 'Smileys' },
  { emoji: '👿', name: 'angry face with horns devil evil mad', category: 'Smileys' },
  { emoji: '💀', name: 'skull death dead ghost', category: 'Smileys' },
  { emoji: '💩', name: 'pile of poo poop turd funny', category: 'Smileys' },
  { emoji: '👻', name: 'ghost spook scary holloween', category: 'Smileys' },
  { emoji: '👽', name: 'alien ufo space mystery', category: 'Smileys' },
  { emoji: '👾', name: 'alien monster game retro invader', category: 'Smileys' },
  { emoji: '🤖', name: 'robot machine bot future tech', category: 'Smileys' },

  // Gestures & Body
  { emoji: '👍', name: 'thumbs up thumbsup like yes approve ok good', category: 'Gestures' },
  { emoji: '👎', name: 'thumbs down thumbsdown dislike no reject bad', category: 'Gestures' },
  { emoji: '👌', name: 'ok hand okay correct perfect', category: 'Gestures' },
  { emoji: '✌️', name: 'victory hand peace sign two', category: 'Gestures' },
  { emoji: '🤞', name: 'crossed fingers hope luck wish', category: 'Gestures' },
  { emoji: '🤟', name: 'love-you gesture sign love', category: 'Gestures' },
  { emoji: '🤘', name: 'sign of the horns rock on metal music', category: 'Gestures' },
  { emoji: '🤙', name: 'call me hand phone gesture', category: 'Gestures' },
  { emoji: '👈', name: 'backhand index pointing left point left direction', category: 'Gestures' },
  { emoji: '👉', name: 'backhand index pointing right point right direction', category: 'Gestures' },
  { emoji: '👆', name: 'backhand index pointing up point up direction ceiling', category: 'Gestures' },
  { emoji: '👇', name: 'backhand index pointing down point down direction floor', category: 'Gestures' },
  { emoji: '👋', name: 'waving hand wave hello hi goodbye bye', category: 'Gestures' },
  { emoji: '👏', name: 'clapping hands clap bravo celebrate', category: 'Gestures' },
  { emoji: '🙌', name: 'raising hands celebrate victory praise hooray', category: 'Gestures' },
  { emoji: '👐', name: 'open hands welcome hugs', category: 'Gestures' },
  { emoji: '🤲', name: 'palms up together request pray book', category: 'Gestures' },
  { emoji: '🤝', name: 'handshake deal shake hands partner agreement', category: 'Gestures' },
  { emoji: '🙏', name: 'folded hands pray please thank you namaste hope', category: 'Gestures' },
  { emoji: '✍️', name: 'writing hand write pen pencil note signature', category: 'Gestures' },
  { emoji: '💪', name: 'flexed biceps muscle strong power workout fitness gym', category: 'Gestures' },
  { emoji: '🧠', name: 'brain mind think logic intelligence smart', category: 'Gestures' },
  { emoji: '👀', name: 'eyes look watch see spying suspicious', category: 'Gestures' },

  // Hearts & Love
  { emoji: '❤️', name: 'red heart love passion heart', category: 'Hearts' },
  { emoji: '🧡', name: 'orange heart love heart', category: 'Hearts' },
  { emoji: '💛', name: 'yellow heart love heart friendship', category: 'Hearts' },
  { emoji: '💚', name: 'green heart love heart', category: 'Hearts' },
  { emoji: '💙', name: 'blue heart love heart trust', category: 'Hearts' },
  { emoji: '💜', name: 'purple heart love heart vanta', category: 'Hearts' },
  { emoji: '🖤', name: 'black heart love heart dark', category: 'Hearts' },
  { emoji: '🤍', name: 'white heart love heart clean', category: 'Hearts' },
  { emoji: '🤎', name: 'brown heart love heart', category: 'Hearts' },
  { emoji: '💔', name: 'broken heart heartbreak sad love end', category: 'Hearts' },
  { emoji: '❤️‍🔥', name: 'heart on fire love burning passion hot', category: 'Hearts' },
  { emoji: '💕', name: 'two hearts love double affection', category: 'Hearts' },
  { emoji: '💞', name: 'revolving hearts love heart spin', category: 'Hearts' },
  { emoji: '💓', name: 'beating heart love heart pulse vibration', category: 'Hearts' },
  { emoji: '💗', name: 'growing heart love heart size expand', category: 'Hearts' },
  { emoji: '💖', name: 'sparkling heart love heart sparkle shine gold', category: 'Hearts' },
  { emoji: '💘', name: 'heart with arrow love cupid romance valentine', category: 'Hearts' },
  { emoji: '💝', name: 'heart with ribbon love gift present ribbon valentine', category: 'Hearts' },
  { emoji: '❣️', name: 'heart exclamation love punctuation mark alert', category: 'Hearts' },

  // Objects & Symbols
  { emoji: '✨', name: 'sparkles shine sparkle bright gold stars clean', category: 'Symbols' },
  { emoji: '⚡', name: 'high voltage lightning bolt electricity spark flash fast energy', category: 'Symbols' },
  { emoji: '🔥', name: 'fire flame hot burning popular trend heat warm', category: 'Symbols' },
  { emoji: '💥', name: 'collision explosion boom bang blast surprise', category: 'Symbols' },
  { emoji: '⭐', name: 'star gold rating yellow favorite', category: 'Symbols' },
  { emoji: '🌟', name: 'glowing star bright shine yellow', category: 'Symbols' },
  { emoji: '💫', name: 'dizzy star spin loop yellow circular', category: 'Symbols' },
  { emoji: '🎉', name: 'party popper celebrate confetti birthday party congrats', category: 'Symbols' },
  { emoji: '🎊', name: 'confetti ball celebrate party congrats ornament', category: 'Symbols' },
  { emoji: '🎈', name: 'balloon red party birthday fly', category: 'Symbols' },
  { emoji: '🎁', name: 'wrapped gift present package birthday Christmas box', category: 'Symbols' },
  { emoji: '👑', name: 'crown king queen royal gold leader winner', category: 'Symbols' },
  { emoji: '🏆', name: 'trophy gold cup award winner first prize success', category: 'Symbols' },
  { emoji: '🥇', name: '1st place medal gold first winner award', category: 'Symbols' },
  { emoji: '💡', name: 'light bulb idea bright light smart think invention', category: 'Symbols' },
  { emoji: '⏰', name: 'alarm clock time timer alert wake bell morning', category: 'Symbols' },
  { emoji: '⏱️', name: 'stopwatch time timer clock measure speed', category: 'Symbols' },
  { emoji: '⏳', name: 'hourglass sand flowing time timer wait limit', category: 'Symbols' },
  { emoji: '🔒', name: 'locked lock secure privacy close key safe encrypt', category: 'Symbols' },
  { emoji: '🔓', name: 'unlocked lock open security access key decrypt', category: 'Symbols' },
  { emoji: '🔑', name: 'key security access unlock gold secret', category: 'Symbols' },
  { emoji: '🛡️', name: 'shield guard protect defense safety secure war vanta', category: 'Symbols' },
  { emoji: '⚙️', name: 'gear cog settings options work engineer process', category: 'Symbols' },
  { emoji: '✉️', name: 'envelope mail letter post message inbox receive', category: 'Symbols' },
  { emoji: '📌', name: 'pushpin pin map office note board red', category: 'Symbols' },
  { emoji: '🗑️', name: 'wastebasket trash can dustbin delete bin clear remove', category: 'Symbols' },

  // Animals & Nature
  { emoji: '🐶', name: 'dog face puppy pet bark animal', category: 'Animals' },
  { emoji: '🐱', name: 'cat face kitten pet meow animal', category: 'Animals' },
  { emoji: '🐭', name: 'mouse face rat pet animal cheese', category: 'Animals' },
  { emoji: '🐹', name: 'hamster face pet rodent animal', category: 'Animals' },
  { emoji: '🐰', name: 'rabbit face bunny pet easter animal carrot', category: 'Animals' },
  { emoji: '🦊', name: 'fox face sly wild animal orange', category: 'Animals' },
  { emoji: '🐻', name: 'bear face wild animal brown forest', category: 'Animals' },
  { emoji: '🐼', name: 'panda face wild animal black white china bamboo', category: 'Animals' },
  { emoji: '🐨', name: 'koala wild animal Australia grey eucalyptus', category: 'Animals' },
  { emoji: '🐯', name: 'tiger face wild cat stripes predator animal forest', category: 'Animals' },
  { emoji: '🦁', name: 'lion face king forest wild cat predator animal safari', category: 'Animals' },
  { emoji: '🐮', name: 'cow face farm milk animal pet beef', category: 'Animals' },
  { emoji: '🐷', name: 'pig face farm pork animal pink pet', category: 'Animals' },
  { emoji: '🐸', name: 'frog face green pond amphibian animal hop jump', category: 'Animals' },
  { emoji: '🐵', name: 'monkey face chimp animal ape forest banana', category: 'Animals' },
  { emoji: '🦄', name: 'unicorn horse magic fantasy purple horn animal', category: 'Animals' },
  { emoji: '🐝', name: 'honeybee bee honey insect sting bug stripe yellow black', category: 'Animals' },
  { emoji: '🦋', name: 'butterfly insect bug wing beauty colors fly', category: 'Animals' },
  { emoji: '🦖', name: 't-rex dinosaur t-rex predator reptile fossil green animal', category: 'Animals' },
  { emoji: '🐢', name: 'turtle pet reptile shell slow pond sea animal', category: 'Animals' },
  { emoji: '🐙', name: 'octopus sea creature water eight legs purple animal', category: 'Animals' },
  { emoji: '🐬', name: 'dolphin sea creature water ocean smart friendly animal', category: 'Animals' },
  { emoji: '🐠', name: 'tropical fish sea creature water color coral ocean animal', category: 'Animals' },
  { emoji: '🌞', name: 'sun with face solar day summer weather hot yellow', category: 'Animals' },
  { emoji: '🌙', name: 'crescent moon night night sleep sky dark silver', category: 'Animals' },
  { emoji: '🌈', name: 'rainbow sky colors rain sun summer beautiful', category: 'Animals' },
  { emoji: '🍀', name: 'four leaf clover luck shamrock green leaf plant', category: 'Animals' },

  // Food & Drink
  { emoji: '🍕', name: 'pizza cheese pepperoni slice food Italian dinner fastfood', category: 'Food' },
  { emoji: '🍔', name: 'hamburger burger cheese beef meat sandwich fastfood food lunch', category: 'Food' },
  { emoji: '🍟', name: 'french fries potato chips fastfood food snack', category: 'Food' },
  { emoji: '🌭', name: 'hot dog sausage bread fastfood food snack', category: 'Food' },
  { emoji: '🌮', name: 'taco Mexican food snack shell dinner wrap', category: 'Food' },
  { emoji: '🍣', name: 'sushi Japanese raw fish rice dinner food seafood', category: 'Food' },
  { emoji: '🍜', name: 'steaming bowl ramen noodles soup dinner food hot Asian', category: 'Food' },
  { emoji: '🥗', name: 'green salad healthy food diet vegetable bowl', category: 'Food' },
  { emoji: '🍩', name: 'donut sweet dessert bakery sugar glaze chocolate', category: 'Food' },
  { emoji: '🍪', name: 'cookie sweet dessert bakery chocolate chip snack biscuit', category: 'Food' },
  { emoji: '🎂', name: 'birthday cake sweet dessert bakery candle celebration party', category: 'Food' },
  { emoji: '🍫', name: 'chocolate bar sweet dessert candy brown snack wrapper', category: 'Food' },
  { emoji: '🍎', name: 'red apple fruit healthy sweet snack garden', category: 'Food' },
  { emoji: '🍌', name: 'banana fruit yellow sweet healthy monkey snack', category: 'Food' },
  { emoji: '🍉', name: 'watermelon fruit green red sweet water summer refreshing slice', category: 'Food' },
  { emoji: '🍓', name: 'strawberry fruit red sweet berry healthy garden dessert', category: 'Food' },
  { emoji: '☕', name: 'hot beverage coffee tea cup mug caffeine morning drink warm', category: 'Food' },
  { emoji: '🍺', name: 'beer mug alcohol drink bar pub celebration yellow foam cold', category: 'Food' },
  { emoji: '🍷', name: 'wine glass alcohol red wine drink bar dinner celebration', category: 'Food' },
  { emoji: '🥤', name: 'cup with straw juice soda drink fastfood cold refreshing', category: 'Food' },
];

const CATEGORIES = ['All', 'Smileys', 'Gestures', 'Hearts', 'Symbols', 'Animals', 'Food'];

export default function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled
}) {
  const [message, setMessage] = useState('');
  const { showToast } = useUI();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Emoji picker states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const inputRef = useRef(null);
  const pickerWrapperRef = useRef(null);

  // Close emoji picker when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerWrapperRef.current &&
        !pickerWrapperRef.current.contains(event.target) &&
        !event.target.closest('.btn-emoji')
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicators
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    setShowEmojiPicker(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onTypingStop();
  };

  const handleAttachment = () => {
    showToast('Attachments are disabled in this room.', 'info');
  };

  const handleEmojiSelect = (emoji) => {
    if (!inputRef.current) return;

    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;

    const textBefore = message.substring(0, start);
    const textAfter = message.substring(end);
    const newMessage = textBefore + emoji + textAfter;

    setMessage(newMessage);

    // Focus input and set cursor position right after the inserted emoji
    const newCursorPos = start + emoji.length;
    setTimeout(() => {
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current.focus();
    }, 0);
  };

  // Filter emojis based on selected category and search term
  const filteredEmojis = EMOJI_DATA.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !emojiSearchQuery ||
      item.name.toLowerCase().includes(emojiSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="message-input-form-wrapper" style={{ position: 'relative', width: '100%' }}>
      {showEmojiPicker && (
        <div className="vanta-emoji-picker" ref={pickerWrapperRef}>
          <div className="emoji-picker-search-container">
            <input
              type="text"
              className="emoji-picker-search-input"
              placeholder="Search emojis..."
              value={emojiSearchQuery}
              onChange={(e) => setEmojiSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="emoji-picker-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn-category ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="emoji-picker-grid">
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji}
                type="button"
                className="emoji-item-btn"
                onClick={() => handleEmojiSelect(item.emoji)}
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
            {filteredEmojis.length === 0 && (
              <div className="no-emojis-found">No emojis found</div>
            )}
          </div>
        </div>
      )}

      <form className="message-input-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="btn-attachment"
          onClick={handleAttachment}
          disabled={disabled}
          title="Attach file"
        >
          📎
        </button>
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={disabled ? 'Room deleted...' : 'Type a message...'}
          value={message}
          onChange={handleChange}
          disabled={disabled}
        />
        <button
          type="button"
          className={`btn-emoji ${showEmojiPicker ? 'active' : ''}`}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          title="Add emoji"
        >
          😀
        </button>
        <button
          type="submit"
          className="btn-send"
          disabled={!message.trim() || disabled}
          title="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  onTypingStart: PropTypes.func.isRequired,
  onTypingStop: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

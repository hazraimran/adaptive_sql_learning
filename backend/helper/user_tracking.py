from typing import List, Dict, Any

def calculate_typing_metrics(events: List[Dict[str, Any]]) -> Dict[str, float]:
    if not events:
        return {
            "avg_dwell_time_ms": 0.0,
            "avg_flight_time_ms": 0.0,
            "keys_per_sec": 0.0,
            "backspace_rate": 0.0,
            "delete_rate": 0.0,
        }

    dwell_times = []
    flight_times = []
    total_key_count = 0      
    backspace_count = 0
    delete_count = 0
    
    keydown_buffer = {}        # {key_counter: {'key': str, 'timestamp': float}}
    key_counter = 0            
    last_keyup_time = None     

    for event in events:
        key = event.get('key')
        if event.get('type') == 'keydown':
            total_key_count += 1
            
            if key == 'Backspace':
                backspace_count += 1
            elif key == 'Delete':
                delete_count += 1

            # flight Time: calculate time since last keyup
            if last_keyup_time is not None:
                flight_time = event['timestamp'] - last_keyup_time
                if flight_time > 0:
                    flight_times.append(flight_time)

            # store keydown event in buffer
            key_id = key_counter
            key_counter += 1
            keydown_buffer[key_id] = {'key': key, 'timestamp': event['timestamp']}

        elif event.get('type') == 'keyup':
            # search for matching keydown in buffer
            matching_ids = [
                id for id, data in keydown_buffer.items() 
                if data['key'] == key
            ]
            
            if matching_ids:
                key_id_to_match = max(matching_ids)
                down_ts = keydown_buffer[key_id_to_match]['timestamp']
                dwell = event['timestamp'] - down_ts
                if dwell > 0:
                    dwell_times.append(dwell)

                del keydown_buffer[key_id_to_match]

            # update last keyup time
            last_keyup_time = event['timestamp']
    
    avg_dwell_time_ms = round(sum(dwell_times) / len(dwell_times), 2) if dwell_times else 0.0
    avg_flight_time_ms = round(sum(flight_times) / len(flight_times), 2) if flight_times else 0.0

    if len(events) > 1:
        total_duration_ms = events[-1]['timestamp'] - events[0]['timestamp']
    else:
        total_duration_ms = 0
        
    total_duration_seconds = total_duration_ms / 1000.0
    
    keys_per_sec = 0.0
    if total_duration_seconds > 0:
        keys_per_sec = total_key_count / total_duration_seconds
    
    denominator = max(1, total_key_count) 
    backspace_rate = round(backspace_count / denominator, 4)
    delete_rate = round(delete_count / denominator, 4)

    return {
        "avg_dwell_time_ms": avg_dwell_time_ms, 
        "avg_flight_time_ms": avg_flight_time_ms,
        "keys_per_sec": round(keys_per_sec, 2), 
        "backspace_rate": backspace_rate,
        "delete_rate": delete_rate,
    }

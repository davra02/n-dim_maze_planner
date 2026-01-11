(define (problem maze-4d-3agents-unsolvable)
  (:domain temporal-maze)
  (:objects
    ;; 4D cells: c<w>_<x>_<y>_<z>
    c0_0_0_0 c0_0_0_1 c0_0_0_2 c0_0_0_3 c0_0_0_4
    c0_0_1_1 c0_0_1_2 c0_0_1_3
    c0_0_2_3 c0_0_2_4 c0_0_2_5
    c0_1_0_4 c0_1_0_5 c0_1_0_6
    c0_1_1_4 c0_1_1_5 c0_1_1_6

    c2_0_0_0 c2_0_0_1 c2_0_0_2
    c2_0_1_1 c2_0_1_2
    c2_0_2_1 c2_0_2_2
    c2_1_2_2

    c3_0_1_2 c3_0_2_1 c3_0_2_2 c3_0_2_3
    c3_1_2_2

    ;; Unreachable goal cell (only reachable through a door that can never open)
    c9_9_9_9

    - cell

    b1 b2 b3 b4 - button
    d1 d2 d3 d4 d9 - door
    e1 - elevator
    a1 a2 a3 - agent
  )

  (:init
    ;; Agent starts
    (agent-at a1 c0_0_0_0)
    (agent-at a2 c0_0_0_1)
    (agent-at a3 c0_0_0_2)
    (agent-free a1)
    (agent-free a2)
    (agent-free a3)

    ;; Buttons and what they control
    (up b1 d1)
    (up b2 d2)
    (up b4 d4)
    (up-elevator b3 e1)

    ;; Button locations
    (button-at b1 c0_0_1_2)
    (button-at b2 c0_0_2_5)
    (button-at b3 c0_1_1_6)
    (button-at b4 c2_0_1_1)

    ;; Hub corridor
    (adjacent c0_0_0_0 c0_0_0_1)
    (adjacent c0_0_0_1 c0_0_0_0)
    (adjacent c0_0_0_1 c0_0_0_2)
    (adjacent c0_0_0_2 c0_0_0_1)
    (adjacent c0_0_0_2 c0_0_0_3)
    (adjacent c0_0_0_3 c0_0_0_2)
    (adjacent c0_0_0_3 c0_0_0_4)
    (adjacent c0_0_0_4 c0_0_0_3)

    ;; Loop to reach b1
    (adjacent c0_0_0_2 c0_0_1_1)
    (adjacent c0_0_1_1 c0_0_0_2)
    (adjacent c0_0_1_1 c0_0_1_2)
    (adjacent c0_0_1_2 c0_0_1_1)
    (adjacent c0_0_1_2 c0_0_1_3)
    (adjacent c0_0_1_3 c0_0_1_2)
    (adjacent c0_0_1_3 c0_0_0_4)
    (adjacent c0_0_0_4 c0_0_1_3)

    ;; Timed-door branch to reach b2
    (adjacent c0_0_2_3 c0_0_2_4)
    (adjacent c0_0_2_4 c0_0_2_3)
    (adjacent c0_0_2_4 c0_0_2_5)
    (adjacent c0_0_2_5 c0_0_2_4)

    (adjacent c0_0_2_4 c0_0_0_4)
    (adjacent c0_0_0_4 c0_0_2_4)

    ;; Door edges
    (connects d1 c0_0_0_4 c0_1_0_4)
    (connects d1 c0_1_0_4 c0_0_0_4)

    ;; d3: timed door to access b2
    (connects d3 c0_0_0_3 c0_0_2_3)
    (connects d3 c0_0_2_3 c0_0_0_3)

    ;; Corridor after d1
    (adjacent c0_1_0_4 c0_1_0_5)
    (adjacent c0_1_0_5 c0_1_0_4)
    (adjacent c0_1_0_5 c0_1_0_6)
    (adjacent c0_1_0_6 c0_1_0_5)

    ;; Stairs up to the elevator terminal
    (stairs c0_1_0_6 c0_1_1_6)
    (stairs c0_1_1_6 c0_1_0_6)

    ;; Upper landing
    (adjacent c0_1_1_6 c0_1_1_5)
    (adjacent c0_1_1_5 c0_1_1_6)
    (adjacent c0_1_1_5 c0_1_1_4)
    (adjacent c0_1_1_4 c0_1_1_5)
    (adjacent c0_1_1_4 c0_1_1_6)
    (adjacent c0_1_1_6 c0_1_1_4)

    ;; Elevator
    (elevator-connects e1 c0_1_1_6 c2_0_0_0)
    (elevator-connects e1 c2_0_0_0 c0_1_1_6)

    ;; Destination region
    (adjacent c2_0_0_0 c2_0_0_1)
    (adjacent c2_0_0_1 c2_0_0_0)
    (adjacent c2_0_0_1 c2_0_0_2)
    (adjacent c2_0_0_2 c2_0_0_1)

    ;; d2 blocks the rest (opened by b2)
    (connects d2 c2_0_0_2 c2_0_1_2)
    (connects d2 c2_0_1_2 c2_0_0_2)

    ;; After d2
    (adjacent c2_0_1_2 c2_0_2_2)
    (adjacent c2_0_2_2 c2_0_1_2)

    (adjacent c2_0_1_2 c2_0_1_1)
    (adjacent c2_0_1_1 c2_0_1_2)
    (adjacent c2_0_1_1 c2_0_2_1)
    (adjacent c2_0_2_1 c2_0_1_1)
    (adjacent c2_0_2_1 c2_0_2_2)
    (adjacent c2_0_2_2 c2_0_2_1)

    (adjacent c2_0_2_2 c2_1_2_2)
    (adjacent c2_1_2_2 c2_0_2_2)

    ;; Stairs to layer w=3
    (stairs c2_0_2_2 c3_0_2_2)
    (stairs c3_0_2_2 c2_0_2_2)

    ;; Layer w=3 local maze
    (adjacent c3_0_2_2 c3_0_1_2)
    (adjacent c3_0_1_2 c3_0_2_2)
    (adjacent c3_0_1_2 c3_0_2_1)
    (adjacent c3_0_2_1 c3_0_1_2)
    (adjacent c3_0_2_1 c3_0_2_2)
    (adjacent c3_0_2_2 c3_0_2_1)

    (adjacent c3_0_2_2 c3_1_2_2)
    (adjacent c3_1_2_2 c3_0_2_2)

    ;; d4 is opened by b4
    (connects d4 c3_0_2_2 c3_0_2_3)
    (connects d4 c3_0_2_3 c3_0_2_2)

    ;; UNSOLVABLE: d9 is the ONLY way to reach c9_9_9_9, and d9 can NEVER open
    ;; No (up ?b d9) and no timed (door-open d9)
    (connects d9 c3_0_2_3 c9_9_9_9)
    (connects d9 c9_9_9_9 c3_0_2_3)

    ;; Timed initial literals: d3 opens only in this time window
    (at 12 (door-open d3))
    (at 22 (not (door-open d3)))

    (= (total-cost) 0)
  )

  (:goal (and
    ;; a3 must reach b2 branch
    (agent-at a3 c0_0_2_5)
    ;; a1 must reach the elevator destination region
    (agent-at a1 c2_0_2_2)
    ;; a2 must reach an unreachable cell
    (agent-at a2 c9_9_9_9)
  ))

  (:metric minimize (total-cost))
)
